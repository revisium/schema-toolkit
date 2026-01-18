import {
  parseFormula,
  buildDependencyGraph,
  getTopologicalOrder,
  evaluateWithContext,
  type EvaluateContextOptions,
} from '@revisium/formula';
import { type JsonSchema } from '../types/index.js';
import {
  extractSchemaFormulas,
  type ExtractedFormula,
} from './extract-schema-formulas.js';

export { formulaSpec } from '@revisium/formula/spec';
export { extractSchemaFormulas };
export type { ExtractedFormula };
export {
  validateSchemaFormulas,
  validateFormulaAgainstSchema,
  type SchemaValidationResult,
  type FormulaValidationError,
} from './validate-schema-formulas.js';

export interface PreparedFormula {
  fieldName: string;
  expression: string;
  fieldType: string;
  dependencies: string[];
  isArrayItem: boolean;
  arrayPath: string | null;
  localFieldPath: string;
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

export function prepareFormulas(schema: JsonSchema): PreparedFormula[] {
  const formulas = extractSchemaFormulas(schema as Record<string, unknown>);

  if (formulas.length === 0) {
    return [];
  }

  const formulasWithMeta = formulas.map((f) => enrichFormula(f));

  if (formulas.length <= 1) {
    return formulasWithMeta;
  }

  return orderByDependencies(formulasWithMeta);
}

export function evaluateFormulas(
  formulas: PreparedFormula[],
  data: Record<string, unknown>,
  options: EvaluateFormulasOptions = {},
): EvaluateFormulasResult {
  const values: Record<string, unknown> = {};
  const errors: FormulaError[] = [];
  const failedFields = new Set<string>();

  for (const formula of formulas) {
    const hasDependencyFailure = formula.dependencies.some((dep) =>
      failedFields.has(dep),
    );

    if (hasDependencyFailure) {
      failedFields.add(formula.fieldName);
      if (options.useDefaults) {
        const defaultValue = getDefaultValue(formula, options.defaults);
        setValueByPath(values, formula.fieldName, defaultValue);
        setValueByPath(data, formula.fieldName, defaultValue);
      }
      errors.push(
        createError(formula, 'Dependency formula failed', options.useDefaults ?? false),
      );
      continue;
    }

    const formulaErrors = evaluateFormula(formula, data, values, options);

    if (formulaErrors.length > 0) {
      errors.push(...formulaErrors);
      failedFields.add(formula.fieldName);
    }
  }

  return { values, errors };
}

function enrichFormula(formula: ExtractedFormula): PreparedFormula {
  const dependencies = parseDependencies(formula.expression);
  const pathInfo = parseArrayItemPath(formula.fieldName);

  return { ...formula, dependencies, ...pathInfo };
}

function parseDependencies(expression: string): string[] {
  try {
    return parseFormula(expression).dependencies;
  } catch {
    return [];
  }
}

function parseArrayItemPath(fieldName: string): {
  isArrayItem: boolean;
  arrayPath: string | null;
  localFieldPath: string;
} {
  const bracketIndex = fieldName.indexOf('[]');

  if (bracketIndex === -1) {
    return { isArrayItem: false, arrayPath: null, localFieldPath: fieldName };
  }

  const arrayPath = fieldName.slice(0, bracketIndex);
  const afterBrackets = fieldName.slice(bracketIndex + 2);
  const localFieldPath = afterBrackets.startsWith('.')
    ? afterBrackets.slice(1)
    : afterBrackets;

  return { isArrayItem: true, arrayPath, localFieldPath };
}

function orderByDependencies(formulas: PreparedFormula[]): PreparedFormula[] {
  const dependencies = Object.fromEntries(
    formulas.map((f) => [f.fieldName, f.dependencies]),
  );

  const result = getTopologicalOrder(buildDependencyGraph(dependencies));

  if (!result.success) {
    throw new Error(
      `Cyclic dependency detected in formulas: ${result.error ?? 'unknown error'}`,
    );
  }

  const formulaMap = new Map(formulas.map((f) => [f.fieldName, f]));

  return result.order
    .map((name) => formulaMap.get(name))
    .filter((f): f is PreparedFormula => f !== undefined);
}

function evaluateFormula(
  formula: PreparedFormula,
  data: Record<string, unknown>,
  values: Record<string, unknown>,
  options: EvaluateFormulasOptions,
): FormulaError[] {
  if (formula.isArrayItem && formula.arrayPath) {
    return evaluateArrayFormula(formula, data, values, options);
  }

  return evaluateSingleFormula(formula, data, values, options);
}

function evaluateSingleFormula(
  formula: PreparedFormula,
  data: Record<string, unknown>,
  values: Record<string, unknown>,
  options: EvaluateFormulasOptions,
): FormulaError[] {
  const context: EvaluateContextOptions = { rootData: data };

  try {
    const result = evaluateWithContext(formula.expression, context);

    if (result === undefined) {
      if (options.useDefaults) {
        const defaultValue = getDefaultValue(formula, options.defaults);
        setValueByPath(values, formula.fieldName, defaultValue);
        setValueByPath(data, formula.fieldName, defaultValue);
      }
      return [
        createError(
          formula,
          'Formula returned undefined',
          options.useDefaults ?? false,
        ),
      ];
    }

    setValueByPath(values, formula.fieldName, result);
    setValueByPath(data, formula.fieldName, result);
    return [];
  } catch (error) {
    if (options.useDefaults) {
      const defaultValue = getDefaultValue(formula, options.defaults);
      setValueByPath(values, formula.fieldName, defaultValue);
      setValueByPath(data, formula.fieldName, defaultValue);
    }
    return [
      createError(
        formula,
        error instanceof Error ? error.message : String(error),
        options.useDefaults ?? false,
      ),
    ];
  }
}

function evaluateArrayFormula(
  formula: PreparedFormula,
  data: Record<string, unknown>,
  values: Record<string, unknown>,
  options: EvaluateFormulasOptions,
): FormulaError[] {
  const errors: FormulaError[] = [];
  const arrayPath = formula.arrayPath!;
  const array = getValueByPath(data, arrayPath) as unknown[];

  if (!Array.isArray(array)) {
    return errors;
  }

  for (let i = 0; i < array.length; i++) {
    const item = array[i];
    if (typeof item !== 'object' || item === null) {
      continue;
    }

    const itemData = item as Record<string, unknown>;
    const fieldPath = `${arrayPath}[${i}].${formula.localFieldPath}`;

    const context: EvaluateContextOptions = {
      rootData: data,
      itemData,
      currentPath: `${arrayPath}[${i}]`,
    };

    try {
      const result = evaluateWithContext(formula.expression, context);

      if (result === undefined) {
        if (options.useDefaults) {
          const defaultValue = getDefaultValue(formula, options.defaults);
          setValueByPath(values, fieldPath, defaultValue);
          setValueByPath(itemData, formula.localFieldPath, defaultValue);
        }
        errors.push({
          field: fieldPath,
          expression: formula.expression,
          error: 'Formula returned undefined',
          defaultUsed: options.useDefaults ?? false,
        });
        continue;
      }

      setValueByPath(values, fieldPath, result);
      setValueByPath(itemData, formula.localFieldPath, result);
    } catch (error) {
      if (options.useDefaults) {
        const defaultValue = getDefaultValue(formula, options.defaults);
        setValueByPath(values, fieldPath, defaultValue);
        setValueByPath(itemData, formula.localFieldPath, defaultValue);
      }
      errors.push({
        field: fieldPath,
        expression: formula.expression,
        error: error instanceof Error ? error.message : String(error),
        defaultUsed: options.useDefaults ?? false,
      });
    }
  }

  return errors;
}

function getValueByPath(
  obj: Record<string, unknown>,
  path: string,
): unknown {
  const segments = path.split('.');
  let current: unknown = obj;

  for (const segment of segments) {
    if (current === null || current === undefined) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }

  return current;
}

function isSafeKey(key: string): boolean {
  return key !== '__proto__';
}

function setValueByPath(
  obj: Record<string, unknown>,
  path: string,
  value: unknown,
): void {
  const segments = path.split('.');
  let current = obj;

  for (let i = 0; i < segments.length - 1; i++) {
    const segment = segments[i]!;
    if (!isSafeKey(segment)) {
      return;
    }
    if (!(segment in current)) {
      current[segment] = {};
    }
    current = current[segment] as Record<string, unknown>;
  }

  const lastSegment = segments.at(-1)!;
  if (!isSafeKey(lastSegment)) {
    return;
  }
  current[lastSegment] = value;
}

function getDefaultValue(
  formula: PreparedFormula,
  defaults?: Record<string, unknown>,
): unknown {
  if (defaults && formula.fieldName in defaults) {
    return defaults[formula.fieldName];
  }

  switch (formula.fieldType) {
    case 'number':
      return 0;
    case 'string':
      return '';
    case 'boolean':
      return false;
    default:
      return null;
  }
}

function createError(
  formula: PreparedFormula,
  error: string,
  defaultUsed: boolean,
): FormulaError {
  return {
    field: formula.fieldName,
    expression: formula.expression,
    error,
    defaultUsed,
  };
}
