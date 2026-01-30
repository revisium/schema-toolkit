import {
  parseFormula,
  evaluateWithContext,
  type ArrayContext,
  type ArrayLevelContext,
} from '@revisium/formula';
import { type JsonSchema } from '../types/index.js';

export { formulaSpec } from '@revisium/formula/spec';
export {
  extractSchemaFormulas,
  type ExtractedFormula,
} from './extract-schema-formulas.js';
export {
  validateSchemaFormulas,
  validateFormulaAgainstSchema,
  type SchemaValidationResult,
  type FormulaValidationError,
} from './validate-schema-formulas.js';

interface ArrayLevelInfo {
  index: number;
  length: number;
  arrayPath: string;
}

export interface FormulaNode {
  path: string;
  expression: string;
  fieldType: 'number' | 'string' | 'boolean';
  currentPath: string;
  dependencies: string[];
  arrayLevels: ArrayLevelInfo[];
}

export interface FormulaError {
  field: string;
  expression: string;
  error: string;
  defaultUsed: boolean;
}

export interface EvaluateFormulasResult {
  values: Record<string, unknown>;
  errors: FormulaError[];
}

export interface EvaluateFormulasOptions {
  useDefaults?: boolean;
  defaults?: Record<string, unknown>;
}

interface SchemaNode {
  type?: string;
  properties?: Record<string, SchemaNode>;
  items?: SchemaNode;
  'x-formula'?: { version: number; expression: string };
}

const FORMULA_TYPES = new Set(['number', 'string', 'boolean']);

interface TraversalContext {
  arrayLevels: ArrayLevelInfo[];
}

export function collectFormulaNodes(
  schema: JsonSchema,
  data: Record<string, unknown>,
): FormulaNode[] {
  const nodes: FormulaNode[] = [];
  traverseAndCollect(schema as SchemaNode, data, '', nodes, { arrayLevels: [] });
  return nodes;
}

function traverseAndCollect(
  schema: SchemaNode,
  data: unknown,
  currentPath: string,
  nodes: FormulaNode[],
  ctx: TraversalContext,
): void {
  if (schema.type === 'object' && schema.properties && typeof data === 'object' && data !== null) {
    const record = data as Record<string, unknown>;

    for (const [fieldName, fieldSchema] of Object.entries(schema.properties)) {
      const fieldPath = currentPath ? `${currentPath}.${fieldName}` : fieldName;
      const fieldValue = record[fieldName];

      if (fieldSchema['x-formula'] && FORMULA_TYPES.has(fieldSchema.type ?? '')) {
        const expression = fieldSchema['x-formula'].expression;
        const parentPath = getParentPath(fieldPath);

        nodes.push({
          path: fieldPath,
          expression,
          fieldType: fieldSchema.type as 'number' | 'string' | 'boolean',
          currentPath: parentPath,
          dependencies: parseDependencies(expression),
          arrayLevels: [...ctx.arrayLevels],
        });
      }

      traverseAndCollect(fieldSchema, fieldValue, fieldPath, nodes, ctx);
    }
  }

  if (schema.type === 'array' && schema.items && Array.isArray(data)) {
    for (let i = 0; i < data.length; i++) {
      const itemPath = `${currentPath}[${i}]`;
      const arrayLevel: ArrayLevelInfo = {
        index: i,
        length: data.length,
        arrayPath: currentPath,
      };
      const newCtx: TraversalContext = {
        arrayLevels: [arrayLevel, ...ctx.arrayLevels],
      };
      traverseAndCollect(schema.items, data[i], itemPath, nodes, newCtx);
    }
  }
}

function parseDependencies(expression: string): string[] {
  try {
    return parseFormula(expression).dependencies;
  } catch {
    return [];
  }
}

function getParentPath(fieldPath: string): string {
  const lastDotIndex = fieldPath.lastIndexOf('.');
  if (lastDotIndex === -1) {
    return '';
  }
  return fieldPath.substring(0, lastDotIndex);
}

export function evaluateFormulas(
  schema: JsonSchema,
  data: Record<string, unknown>,
  options: EvaluateFormulasOptions = {},
): EvaluateFormulasResult {
  const nodes = collectFormulaNodes(schema, data);

  if (nodes.length === 0) {
    return { values: {}, errors: [] };
  }

  const sortedNodes = orderByDependencies(nodes);
  const values: Record<string, unknown> = {};
  const errors: FormulaError[] = [];
  const failedPaths = new Set<string>();

  for (const node of sortedNodes) {
    const hasDependencyFailure = hasFailedDependency(node, failedPaths);

    if (hasDependencyFailure) {
      failedPaths.add(node.path);
      handleError(node, 'Dependency formula failed', data, values, errors, options);
      continue;
    }

    const result = evaluateNode(node, data);

    if (!result.success) {
      failedPaths.add(node.path);
      handleError(node, result.error, data, values, errors, options);
      continue;
    }

    setValueByPath(data, node.path, result.value);
    values[node.path] = result.value;
  }

  return { values, errors };
}

function orderByDependencies(nodes: FormulaNode[]): FormulaNode[] {
  if (nodes.length <= 1) {
    return nodes;
  }

  const formulaNodes = new Set(nodes.map((n) => n.path));
  const visited = new Set<string>();
  const order: FormulaNode[] = [];

  const nodeByPath = new Map(nodes.map((n) => [n.path, n]));

  const visit = (node: FormulaNode, stack: Set<string>): void => {
    if (visited.has(node.path)) {
      return;
    }

    if (stack.has(node.path)) {
      throw new Error(`Cyclic dependency detected in formulas: ${node.path}`);
    }

    stack.add(node.path);

    for (const dep of node.dependencies) {
      if (formulaNodes.has(dep)) {
        const depNode = nodeByPath.get(dep);
        if (depNode) {
          visit(depNode, stack);
        }
      }
    }

    stack.delete(node.path);
    visited.add(node.path);
    order.push(node);
  };

  for (const node of nodes) {
    visit(node, new Set());
  }

  return order;
}

function hasFailedDependency(node: FormulaNode, failedPaths: Set<string>): boolean {
  return node.dependencies.some((dep) => {
    for (const failedPath of failedPaths) {
      if (failedPath === dep || failedPath.endsWith(`.${dep}`)) {
        return true;
      }
    }
    return false;
  });
}

function buildArrayContext(
  node: FormulaNode,
  data: Record<string, unknown>,
): ArrayContext | undefined {
  if (node.arrayLevels.length === 0) {
    return undefined;
  }

  const levels: ArrayLevelContext[] = node.arrayLevels.map((level) => {
    const array = getValueByPath(data, level.arrayPath) as unknown[] | undefined;
    const { index, length } = level;

    let prev: unknown = null;
    let next: unknown = null;

    if (array) {
      if (index > 0) {
        prev = array[index - 1] ?? null;
      }
      if (index < length - 1) {
        next = array[index + 1] ?? null;
      }
    }

    return { index, length, prev, next };
  });

  return { levels };
}

function evaluateNode(
  node: FormulaNode,
  data: Record<string, unknown>,
): { success: true; value: unknown } | { success: false; error: string } {
  try {
    const itemData = node.currentPath
      ? getValueByPath(data, node.currentPath) as Record<string, unknown> | undefined
      : undefined;

    const arrayContext = buildArrayContext(node, data);

    const result = evaluateWithContext(node.expression, {
      rootData: data,
      ...(itemData && { itemData, currentPath: node.currentPath }),
      arrayContext,
    });

    if (result === undefined) {
      return { success: false, error: 'Formula returned undefined' };
    }

    return { success: true, value: result };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function handleError(
  node: FormulaNode,
  errorMessage: string,
  data: Record<string, unknown>,
  values: Record<string, unknown>,
  errors: FormulaError[],
  options: EvaluateFormulasOptions,
): void {
  const defaultUsed = options.useDefaults ?? false;

  if (defaultUsed) {
    const defaultValue = getDefaultValue(node, options.defaults);
    setValueByPath(data, node.path, defaultValue);
    values[node.path] = defaultValue;
  }

  errors.push({
    field: node.path,
    expression: node.expression,
    error: errorMessage,
    defaultUsed,
  });
}

function getDefaultValue(
  node: FormulaNode,
  defaults?: Record<string, unknown>,
): unknown {
  if (defaults && node.path in defaults) {
    return defaults[node.path];
  }

  switch (node.fieldType) {
    case 'number':
      return 0;
    case 'string':
      return '';
    case 'boolean':
      return false;
  }
}

function getValueByPath(
  obj: Record<string, unknown>,
  path: string,
): unknown {
  const segments = parsePath(path);
  let current: unknown = obj;

  for (const segment of segments) {
    if (current === null || current === undefined) {
      return undefined;
    }

    if (segment.type === 'field') {
      current = (current as Record<string, unknown>)[segment.name];
    } else {
      if (!Array.isArray(current)) {
        return undefined;
      }
      current = current[segment.index];
    }
  }

  return current;
}

type PathSegment = { type: 'field'; name: string } | { type: 'index'; index: number };

function parsePath(path: string): PathSegment[] {
  const segments: PathSegment[] = [];
  let current = '';
  let position = 0;

  while (position < path.length) {
    const char = path[position];

    if (char === '.') {
      if (current) {
        segments.push({ type: 'field', name: current });
        current = '';
      }
      position++;
    } else if (char === '[') {
      if (current) {
        segments.push({ type: 'field', name: current });
        current = '';
      }
      const endBracket = path.indexOf(']', position);
      if (endBracket === -1) {
        position++;
      } else {
        const indexStr = path.slice(position + 1, endBracket);
        segments.push({ type: 'index', index: Number.parseInt(indexStr, 10) });
        position = endBracket + 1;
      }
    } else {
      current += char;
      position++;
    }
  }

  if (current) {
    segments.push({ type: 'field', name: current });
  }

  return segments;
}

function isSafeKey(key: string): boolean {
  return key !== '__proto__';
}

function setValueByPath(
  obj: Record<string, unknown>,
  path: string,
  value: unknown,
): void {
  const segments = parsePath(path);
  let current: unknown = obj;

  for (let i = 0; i < segments.length - 1; i++) {
    const segment = segments[i]!;

    if (segment.type === 'field') {
      if (!isSafeKey(segment.name)) {
        return;
      }
      const record = current as Record<string, unknown>;
      if (!(segment.name in record)) {
        record[segment.name] = {};
      }
      current = record[segment.name];
    } else {
      const arr = current as unknown[];
      if (!arr[segment.index]) {
        arr[segment.index] = {};
      }
      current = arr[segment.index];
    }
  }

  const lastSegment = segments.at(-1);
  if (!lastSegment) {
    return;
  }

  if (lastSegment.type === 'field') {
    if (!isSafeKey(lastSegment.name)) {
      return;
    }
    (current as Record<string, unknown>)[lastSegment.name] = value;
  } else {
    (current as unknown[])[lastSegment.index] = value;
  }
}
