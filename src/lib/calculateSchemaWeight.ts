import { JsonObjectSchema, JsonSchema } from '../types/schema.types.js';

export interface SchemaWeight {
  totalFields: number;
  maxDepth: number;
  fieldNames: number;
  totalArrays: number;
  maxArrayDepth: number;
}

export const calculateSchemaWeight = (
  schema: JsonObjectSchema,
): SchemaWeight => {
  const result: SchemaWeight = {
    totalFields: 0,
    maxDepth: 0,
    fieldNames: 0,
    totalArrays: 0,
    maxArrayDepth: 0,
  };

  walkSchema(schema, 0, 0, result);
  return result;
};

const walkSchema = (
  schema: JsonSchema,
  depth: number,
  arrayDepth: number,
  result: SchemaWeight,
): void => {
  if (result.maxDepth < depth) {
    result.maxDepth = depth;
  }

  if ('$ref' in schema) {
    return;
  }

  if (schema.type === 'object' && schema.properties) {
    for (const [fieldName, fieldSchema] of Object.entries(schema.properties)) {
      result.totalFields++;
      result.fieldNames += fieldName.length;
      walkSchema(fieldSchema, depth + 1, arrayDepth, result);
    }
  }

  if (schema.type === 'array' && schema.items) {
    const nextArrayDepth = arrayDepth + 1;
    result.totalArrays++;
    if (nextArrayDepth > result.maxArrayDepth) {
      result.maxArrayDepth = nextArrayDepth;
    }
    walkSchema(schema.items, depth + 1, nextArrayDepth, result);
  }
};
