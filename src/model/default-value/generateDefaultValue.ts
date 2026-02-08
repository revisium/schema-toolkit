import type {
  JsonArraySchema,
  JsonObjectSchema,
  JsonSchema,
} from '../../types/schema.types.js';
import type { GenerateDefaultValueOptions } from './types.js';

const DEFAULT_STRING = '';
const DEFAULT_NUMBER = 0;
const DEFAULT_BOOLEAN = false;

function isRefSchema(schema: JsonSchema): schema is { $ref: string } {
  return '$ref' in schema;
}

function isObjectSchema(schema: JsonSchema): schema is JsonObjectSchema {
  return 'type' in schema && schema.type === 'object';
}

function isArraySchema(schema: JsonSchema): schema is JsonArraySchema {
  return 'type' in schema && schema.type === 'array';
}

function hasDefaultValue(schema: JsonSchema): boolean {
  return 'default' in schema && schema.default !== undefined;
}

function generatePrimitiveDefault(schema: JsonSchema): unknown {
  if (!('type' in schema)) {
    return undefined;
  }

  switch (schema.type) {
    case 'string':
      return DEFAULT_STRING;
    case 'number':
      return DEFAULT_NUMBER;
    case 'boolean':
      return DEFAULT_BOOLEAN;
    default:
      return undefined;
  }
}

function generateObjectDefault(
  schema: JsonObjectSchema,
  options: GenerateDefaultValueOptions,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  if (!schema.properties) {
    return result;
  }

  for (const [key, propertySchema] of Object.entries(schema.properties)) {
    result[key] = generateDefaultValueInternal(propertySchema, options);
  }

  return result;
}

function generateArrayDefault(
  schema: JsonArraySchema,
  options: GenerateDefaultValueOptions,
): unknown[] {
  const itemCount = options.arrayItemCount ?? 0;

  if (itemCount === 0 || !schema.items) {
    return [];
  }

  const itemDefault = generateDefaultValueInternal(schema.items, options);
  return Array.from({ length: itemCount }, () => {
    if (typeof itemDefault === 'object' && itemDefault !== null) {
      return generateDefaultValueInternal(schema.items, options);
    }
    return itemDefault;
  });
}

function generateRefDefault(
  schema: { $ref: string },
  options: GenerateDefaultValueOptions,
): unknown {
  const refSchemas = options.refSchemas;

  if (!refSchemas) {
    return {};
  }

  const refSchema = refSchemas[schema.$ref];

  if (!refSchema) {
    return {};
  }

  return generateDefaultValueInternal(refSchema, options);
}

function generateDefaultValueInternal(
  schema: JsonSchema,
  options: GenerateDefaultValueOptions,
): unknown {
  if (hasDefaultValue(schema)) {
    return (schema as { default: unknown }).default;
  }

  if (isRefSchema(schema)) {
    return generateRefDefault(schema, options);
  }

  if (isObjectSchema(schema)) {
    return generateObjectDefault(schema, options);
  }

  if (isArraySchema(schema)) {
    return generateArrayDefault(schema, options);
  }

  return generatePrimitiveDefault(schema);
}

export function generateDefaultValue(
  schema: JsonSchema | null | undefined,
  options: GenerateDefaultValueOptions = {},
): unknown {
  if (!schema) {
    return {};
  }

  return generateDefaultValueInternal(schema, options);
}
