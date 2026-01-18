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

interface SchemaProperty {
  type?: string;
  properties?: Record<string, SchemaProperty>;
  items?: SchemaProperty;
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
  const schemaFields = getSchemaFields(contextSchema);

  for (const dep of parseResult.dependencies) {
    const rootField = extractFieldRoot(dep);
    if (!schemaFields.has(rootField)) {
      return {
        field: fieldPath,
        error: `Unknown field '${rootField}' in formula`,
      };
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

  const segments = parsePathSegments(fieldPath);
  let current: SchemaProperty | JsonSchemaInput = schema;

  for (const segment of segments) {
    if (segment === '[]') {
      if (current.type === 'array' && current.items) {
        current = current.items;
      } else {
        return null;
      }
    } else {
      if (current.properties?.[segment]) {
        current = current.properties[segment];
      } else {
        return null;
      }
    }
  }

  return current;
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
    if (
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
  if (schemaType === 'number') return 'number';
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
