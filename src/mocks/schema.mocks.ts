import {
  JsonArraySchema,
  JsonBooleanSchema,
  JsonNumberSchema,
  JsonObjectSchema,
  JsonRefSchema,
  JsonSchema,
  JsonSchemaTypeName,
  JsonStringSchema,
  XFormula,
} from '../types/schema.types.js';
import {
  JsonPatchAdd,
  JsonPatchMove,
  JsonPatchRemove,
  JsonPatchReplace,
} from '../types/json-patch.types.js';

export const getReplacePatch = ({
  path,
  value,
}: {
  path: string;
  value: JsonSchema;
}): JsonPatchReplace => ({
  op: 'replace',
  path,
  value,
});

export const getRemovePatch = ({
  path,
}: {
  path: string;
}): JsonPatchRemove => ({
  op: 'remove',
  path,
});

export const getAddPatch = ({
  path,
  value,
}: {
  path: string;
  value: JsonSchema;
}): JsonPatchAdd => ({
  op: 'add',
  path,
  value,
});

export const getMovePatch = ({
  from,
  path,
}: {
  from: string;
  path: string;
}): JsonPatchMove => ({
  op: 'move',
  from,
  path,
});

type StringSchemaOptions = Partial<
  Omit<JsonStringSchema, 'type' | 'x-formula'> & { formula: string }
>;

type NumberSchemaOptions = Partial<
  Omit<JsonNumberSchema, 'type' | 'x-formula'> & { formula: string }
>;

type BooleanSchemaOptions = Partial<
  Omit<JsonBooleanSchema, 'type' | 'x-formula'> & { formula: string }
>;

type ObjectSchemaOptions = Partial<Omit<JsonObjectSchema, 'type' | 'properties' | 'required'>>;

type ArraySchemaOptions = Partial<Omit<JsonArraySchema, 'type' | 'items'>>;

type RefSchemaOptions = Partial<Omit<JsonRefSchema, '$ref'>>;

const buildFormula = (expression: string): XFormula => ({
  version: 1,
  expression,
});

export const getStringSchema = (params: StringSchemaOptions = {}): JsonStringSchema => {
  const { formula, ...rest } = params;
  return {
    type: JsonSchemaTypeName.String,
    ...rest,
    default: rest.default ?? '',
    ...(formula && { 'x-formula': buildFormula(formula) }),
  };
};

export const getNumberSchema = (params: NumberSchemaOptions = {}): JsonNumberSchema => {
  const { formula, ...rest } = params;
  return {
    type: JsonSchemaTypeName.Number,
    ...rest,
    default: rest.default ?? 0,
    ...(formula && { 'x-formula': buildFormula(formula) }),
  };
};

export const getBooleanSchema = (params: BooleanSchemaOptions = {}): JsonBooleanSchema => {
  const { formula, ...rest } = params;
  return {
    type: JsonSchemaTypeName.Boolean,
    ...rest,
    default: rest.default ?? false,
    ...(formula && { 'x-formula': buildFormula(formula) }),
  };
};

export const getObjectSchema = (
  properties: Record<string, JsonSchema>,
  options: ObjectSchemaOptions = {},
): JsonObjectSchema => ({
  type: JsonSchemaTypeName.Object,
  additionalProperties: false,
  required: Object.keys(properties).sort((a, b) => a.localeCompare(b)),
  properties,
  ...options,
});

export const getArraySchema = (
  items: JsonSchema,
  options: ArraySchemaOptions = {},
): JsonArraySchema => ({
  type: JsonSchemaTypeName.Array,
  items,
  ...options,
});

export const getRefSchema = ($ref: string, options: RefSchemaOptions = {}): JsonRefSchema => ({
  $ref,
  ...options,
});

export const str = (params: StringSchemaOptions = {}): JsonStringSchema => getStringSchema(params);
export const num = (params: NumberSchemaOptions = {}): JsonNumberSchema => getNumberSchema(params);
export const bool = (params: BooleanSchemaOptions = {}): JsonBooleanSchema =>
  getBooleanSchema(params);
export const obj = (
  properties: Record<string, JsonSchema>,
  options?: ObjectSchemaOptions,
): JsonObjectSchema => getObjectSchema(properties, options);
export const arr = (items: JsonSchema, options?: ArraySchemaOptions): JsonArraySchema =>
  getArraySchema(items, options);
export const ref = ($ref: string, options?: RefSchemaOptions): JsonRefSchema =>
  getRefSchema($ref, options);

export type {
  StringSchemaOptions,
  NumberSchemaOptions,
  BooleanSchemaOptions,
  ObjectSchemaOptions,
  ArraySchemaOptions,
  RefSchemaOptions,
};

export type { ContentMediaType } from '../types/schema.types.js';
