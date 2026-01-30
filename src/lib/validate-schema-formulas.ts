import {
  parseExpression,
  validateFormulaSyntax,
  buildDependencyGraph,
  detectCircularDependencies,
  inferFormulaType,
  type FieldTypes,
  type InferredType,
} from '@revisium/formula';
import { extractSchemaFormulas } from './extract-schema-formulas.js';

interface XFormula {
  version: number;
  expression: string;
}

interface SchemaProperty {
  type?: string;
  properties?: Record<string, SchemaProperty>;
  items?: SchemaProperty;
  'x-formula'?: XFormula;
  [key: string]: unknown;
}

interface JsonSchemaInput {
  type?: string;
  properties?: Record<string, SchemaProperty>;
  items?: SchemaProperty;
  [key: string]: unknown;
}

export interface FormulaValidationError {
  field: string;
  error: string;
  position?: number;
}

export interface SchemaValidationResult {
  isValid: boolean;
  errors: FormulaValidationError[];
}

export function validateSchemaFormulas(
  schema: JsonSchemaInput,
): SchemaValidationResult {
  const errors: FormulaValidationError[] = [];
  const formulas = extractSchemaFormulas(schema);

  for (const formula of formulas) {
    const error = validateFormulaAgainstSchema(
      formula.expression,
      formula.fieldName,
      schema,
    );
    if (error) {
      errors.push(error);
    }
  }

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  const dependencies: Record<string, string[]> = {};
  for (const formula of formulas) {
    const parseResult = parseExpression(formula.expression);
    const parentPath = getParentPath(formula.fieldName);
    const prefix = parentPath ? `${parentPath}.` : '';

    dependencies[formula.fieldName] = parseResult.dependencies.map((dep) => {
      if (dep.startsWith('/')) {
        return extractFieldRoot(dep.slice(1));
      }
      if (dep.startsWith('../')) {
        return resolveRelativePathForDependency(dep, parentPath);
      }
      const rootField = extractFieldRoot(dep);
      return `${prefix}${rootField}`;
    });
  }

  const graph = buildDependencyGraph(dependencies);
  const circularCheck = detectCircularDependencies(graph);

  const cycle = circularCheck.cycle;
  if (circularCheck.hasCircular && cycle && cycle.length > 0) {
    const firstField = cycle[0];
    if (firstField) {
      errors.push({
        field: firstField,
        error: `Circular dependency: ${cycle.join(' → ')}`,
      });
      return { isValid: false, errors };
    }
  }

  return { isValid: true, errors: [] };
}

export function validateFormulaAgainstSchema(
  expression: string,
  fieldName: string,
  schema: JsonSchemaInput,
): FormulaValidationError | null {
  return validateFormulaInContext(expression, fieldName, schema);
}

function validateFormulaInContext(
  expression: string,
  fieldPath: string,
  rootSchema: JsonSchemaInput,
): FormulaValidationError | null {
  const syntaxResult = validateFormulaSyntax(expression);
  if (!syntaxResult.isValid) {
    return {
      field: fieldPath,
      error: syntaxResult.error,
      position: syntaxResult.position,
    };
  }

  const parentPath = getParentPath(fieldPath);
  const localFieldName = getFieldName(fieldPath);
  const contextSchema = resolveSubSchema(rootSchema, parentPath);

  if (!contextSchema) {
    return {
      field: fieldPath,
      error: `Cannot resolve schema context for path '${parentPath}'`,
    };
  }

  const parseResult = parseExpression(expression);
  const localSchemaFields = getSchemaFields(contextSchema);
  const rootSchemaFields = getSchemaFields(rootSchema);

  for (const dep of parseResult.dependencies) {
    if (dep.startsWith('/')) {
      const rootField = extractFieldRoot(dep.slice(1));
      if (!rootSchemaFields.has(rootField)) {
        return {
          field: fieldPath,
          error: `Unknown root field '${rootField}' in formula`,
        };
      }
    } else if (dep.startsWith('../')) {
      const validationResult = validateRelativePath(
        dep,
        parentPath,
        rootSchema,
        fieldPath,
      );
      if (validationResult) {
        return validationResult;
      }
    } else {
      const rootField = extractFieldRoot(dep);
      if (!localSchemaFields.has(rootField)) {
        return {
          field: fieldPath,
          error: `Unknown field '${rootField}' in formula`,
        };
      }
    }
  }

  if (
    parseResult.dependencies.some((d) => extractFieldRoot(d) === localFieldName)
  ) {
    return {
      field: fieldPath,
      error: `Formula cannot reference itself`,
    };
  }

  const isInsideArray = fieldPath.includes('[');
  if (isInsideArray) {
    const computedFields = getComputedFieldsInContext(contextSchema);
    const arrayRefError = validateArrayReferences(
      expression,
      fieldPath,
      computedFields,
    );
    if (arrayRefError) {
      return arrayRefError;
    }
  }

  const fieldSchema = contextSchema.properties?.[localFieldName];
  const expectedType = schemaTypeToInferred(fieldSchema?.type);
  const fieldTypes = getSchemaFieldTypes(contextSchema);
  const inferredType = inferFormulaType(expression, fieldTypes);

  if (!isTypeCompatible(inferredType, expectedType)) {
    return {
      field: fieldPath,
      error: `Type mismatch: formula returns '${inferredType}' but field expects '${expectedType}'`,
    };
  }

  return null;
}

function resolveSubSchema(
  schema: JsonSchemaInput,
  fieldPath: string,
): SchemaProperty | null {
  if (!fieldPath) {
    return schema;
  }

  const segments = parsePathSegmentsForSchema(fieldPath);
  let current: SchemaProperty | JsonSchemaInput = schema;

  for (const segment of segments) {
    if (segment === '[]') {
      if (current.type === 'array' && current.items) {
        current = current.items;
      } else {
        return null;
      }
    } else if (current.properties?.[segment]) {
      current = current.properties[segment];
    } else {
      return null;
    }
  }

  return current;
}

function parsePathSegmentsForSchema(path: string): string[] {
  const segments: string[] = [];
  let current = '';
  let inBracket = false;

  for (const char of path) {
    if (char === '[') {
      if (current) {
        segments.push(current);
        current = '';
      }
      inBracket = true;
    } else if (char === ']') {
      inBracket = false;
      segments.push('[]');
    } else if (char === '.' && !inBracket) {
      if (current) {
        segments.push(current);
        current = '';
      }
    } else if (!inBracket) {
      current += char;
    }
  }

  if (current) {
    segments.push(current);
  }

  return segments;
}

function parsePathSegments(path: string): string[] {
  const segments: string[] = [];
  let current = '';
  let inBracket = false;

  for (const char of path) {
    if (char === '[') {
      if (current) {
        segments.push(current);
        current = '';
      }
      inBracket = true;
    } else if (char === ']') {
      inBracket = false;
    } else if (char === '.' && !inBracket) {
      if (current) {
        segments.push(current);
        current = '';
      }
    } else if (!inBracket) {
      current += char;
    }
  }

  if (current) {
    segments.push(current);
  }

  return segments;
}

function getParentPath(fieldPath: string): string {
  const lastDotIndex = fieldPath.lastIndexOf('.');
  const lastBracketIndex = fieldPath.lastIndexOf('[');
  const splitIndex = Math.max(lastDotIndex, lastBracketIndex);

  if (splitIndex <= 0) {
    return '';
  }

  return fieldPath.substring(0, splitIndex);
}

function getFieldName(fieldPath: string): string {
  const lastDotIndex = fieldPath.lastIndexOf('.');
  const lastBracketIndex = fieldPath.lastIndexOf(']');
  const splitIndex = Math.max(lastDotIndex, lastBracketIndex);

  if (splitIndex === -1) {
    return fieldPath;
  }

  return fieldPath.substring(splitIndex + 1);
}

function getSchemaFields(schema: SchemaProperty | JsonSchemaInput): Set<string> {
  const fields = new Set<string>();
  const properties = schema.properties ?? {};

  for (const fieldName of Object.keys(properties)) {
    fields.add(fieldName);
  }

  return fields;
}

function getSchemaFieldTypes(schema: SchemaProperty | JsonSchemaInput): FieldTypes {
  const fieldTypes: FieldTypes = {};
  const properties = schema.properties ?? {};

  for (const [fieldName, fieldSchema] of Object.entries(properties)) {
    const schemaType = fieldSchema.type;
    if (schemaType === 'integer') {
      fieldTypes[fieldName] = 'number';
    } else if (
      schemaType === 'number' ||
      schemaType === 'string' ||
      schemaType === 'boolean' ||
      schemaType === 'object' ||
      schemaType === 'array'
    ) {
      fieldTypes[fieldName] = schemaType;
    }
  }

  return fieldTypes;
}

function schemaTypeToInferred(
  schemaType: string | undefined,
): InferredType | null {
  if (schemaType === 'number' || schemaType === 'integer') return 'number';
  if (schemaType === 'string') return 'string';
  if (schemaType === 'boolean') return 'boolean';
  return null;
}

function isTypeCompatible(
  inferredType: InferredType,
  expectedType: InferredType | null,
): boolean {
  if (expectedType === null) return true;
  if (inferredType === 'unknown') return true;
  return inferredType === expectedType;
}

function extractFieldRoot(dependency: string): string {
  const root = dependency.split('.')[0]?.split('[')[0];
  return root || dependency;
}

function countParentLevels(path: string): number {
  let count = 0;
  let remaining = path;
  while (remaining.startsWith('../')) {
    count++;
    remaining = remaining.slice(3);
  }
  return count;
}

function resolveRelativePathForDependency(
  relativePath: string,
  currentPath: string,
): string {
  const parentLevels = countParentLevels(relativePath);
  const fieldAfterParents = relativePath.replace(/^(\.\.\/)+/, '');
  const targetField = extractFieldRoot(fieldAfterParents);

  if (!currentPath) {
    return targetField;
  }

  const pathSegments = parsePathSegments(currentPath);
  const targetLevel = pathSegments.length - parentLevels;

  if (targetLevel <= 0) {
    return targetField;
  }

  const basePath = pathSegments.slice(0, targetLevel).join('.');
  return basePath ? `${basePath}.${targetField}` : targetField;
}

function validateRelativePath(
  relativePath: string,
  currentPath: string,
  rootSchema: JsonSchemaInput,
  fieldPath: string,
): FormulaValidationError | null {
  const parentLevels = countParentLevels(relativePath);
  const fieldAfterParents = relativePath.replace(/^(\.\.\/)+/, '');
  const targetField = extractFieldRoot(fieldAfterParents);

  const pathSegments = parsePathSegments(currentPath);
  const targetLevel = pathSegments.length - parentLevels;

  if (targetLevel <= 0) {
    const rootFields = getSchemaFields(rootSchema);
    if (!rootFields.has(targetField)) {
      return {
        field: fieldPath,
        error: `Unknown root field '${targetField}' in formula`,
      };
    }
    return null;
  }

  const targetPath = pathSegments.slice(0, targetLevel).join('.');
  const targetSchema = resolveSubSchema(rootSchema, targetPath);

  if (!targetSchema) {
    return {
      field: fieldPath,
      error: `Cannot resolve schema for relative path '${relativePath}'`,
    };
  }

  const targetFields = getSchemaFields(targetSchema);
  if (!targetFields.has(targetField)) {
    return {
      field: fieldPath,
      error: `Unknown field '${targetField}' in formula`,
    };
  }

  return null;
}

function getComputedFieldsInContext(
  schema: SchemaProperty | JsonSchemaInput,
): Set<string> {
  const computedFields = new Set<string>();
  const properties = schema.properties ?? {};

  for (const [fieldName, fieldSchema] of Object.entries(properties)) {
    if (fieldSchema['x-formula']) {
      computedFields.add(fieldName);
    }
  }

  return computedFields;
}

function validateArrayReferences(
  expression: string,
  fieldPath: string,
  computedFields: Set<string>,
): FormulaValidationError | null {
  const atNextComputedMatch = expression.match(/@next\.(\w+)/);
  if (atNextComputedMatch) {
    const fieldName = atNextComputedMatch[1];
    if (fieldName && computedFields.has(fieldName)) {
      return {
        field: fieldPath,
        error: `Cannot reference computed field '${fieldName}' via @next. Use @prev instead for cross-element computed field references.`,
      };
    }
  }

  const absoluteIndexMatch = expression.match(/\/[\w[\]]+\[(\d+)\]\.(\w+)/g);
  if (absoluteIndexMatch) {
    for (const match of absoluteIndexMatch) {
      const fieldMatch = match.match(/\.(\w+)$/);
      if (fieldMatch) {
        const fieldName = fieldMatch[1];
        if (fieldName && computedFields.has(fieldName)) {
          return {
            field: fieldPath,
            error: `Absolute index reference to computed field '${fieldName}' may cause forward reference issues. Consider using @prev pattern instead.`,
          };
        }
      }
    }
  }

  return null;
}
