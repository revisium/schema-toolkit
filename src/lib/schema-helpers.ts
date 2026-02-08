import {
  JsonArraySchema,
  JsonBooleanSchema,
  JsonNumberSchema,
  JsonObjectSchema,
  JsonRefSchema,
  JsonSchema,
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

export type StringSchemaOptions = Partial<
  Omit<JsonStringSchema, 'type' | 'x-formula'> & { formula: string }
>;

export type NumberSchemaOptions = Partial<
  Omit<JsonNumberSchema, 'type' | 'x-formula'> & { formula: string }
>;

export type BooleanSchemaOptions = Partial<
  Omit<JsonBooleanSchema, 'type' | 'x-formula'> & { formula: string }
>;

export type ObjectSchemaOptions = Partial<Omit<JsonObjectSchema, 'type' | 'properties' | 'required'>>;

export type ArraySchemaOptions = Partial<Omit<JsonArraySchema, 'type' | 'items'>>;

export type RefSchemaOptions = Partial<Omit<JsonRefSchema, '$ref'>>;

const buildFormula = (expression: string): XFormula => ({
  version: 1,
  expression,
});

export const getStringSchema = (params: StringSchemaOptions = {}): JsonStringSchema => {
  const { formula, ...rest } = params;
  return {
    type: 'string',
    ...rest,
    default: rest.default ?? '',
    ...(formula && { 'x-formula': buildFormula(formula) }),
  };
};

export const getNumberSchema = (params: NumberSchemaOptions = {}): JsonNumberSchema => {
  const { formula, ...rest } = params;
  return {
    type: 'number',
    ...rest,
    default: rest.default ?? 0,
    ...(formula && { 'x-formula': buildFormula(formula) }),
  };
};

export const getBooleanSchema = (params: BooleanSchemaOptions = {}): JsonBooleanSchema => {
  const { formula, ...rest } = params;
  return {
    type: 'boolean',
    ...rest,
    default: rest.default ?? false,
    ...(formula && { 'x-formula': buildFormula(formula) }),
  };
};

export const getObjectSchema = <P extends Record<string, JsonSchema>>(
  properties: P,
  options: ObjectSchemaOptions = {},
): JsonObjectSchema & { readonly properties: { readonly [K in keyof P]: P[K] } } => ({
  type: 'object',
  additionalProperties: false,
  required: Object.keys(properties).sort((a, b) => a.localeCompare(b)),
  properties: properties as { readonly [K in keyof P]: P[K] },
  ...options,
});

export const getArraySchema = <I extends JsonSchema>(
  items: I,
  options: ArraySchemaOptions = {},
): JsonArraySchema & { readonly items: I } => ({
  type: 'array',
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

export type StringFormulaOptions = Omit<StringSchemaOptions, 'formula' | 'readOnly'>;
export type NumberFormulaOptions = Omit<NumberSchemaOptions, 'formula' | 'readOnly'>;
export type BooleanFormulaOptions = Omit<BooleanSchemaOptions, 'formula' | 'readOnly'>;

export const strFormula = (
  formula: string,
  params: StringFormulaOptions = {},
): JsonStringSchema => getStringSchema({ ...params, formula, readOnly: true });
export const numFormula = (
  formula: string,
  params: NumberFormulaOptions = {},
): JsonNumberSchema => getNumberSchema({ ...params, formula, readOnly: true });
export const boolFormula = (
  formula: string,
  params: BooleanFormulaOptions = {},
): JsonBooleanSchema => getBooleanSchema({ ...params, formula, readOnly: true });
export const obj = <P extends Record<string, JsonSchema>>(
  properties: P,
  options?: ObjectSchemaOptions,
): JsonObjectSchema & { readonly properties: { readonly [K in keyof P]: P[K] } } =>
  getObjectSchema(properties, options);
export const arr = <I extends JsonSchema>(
  items: I,
  options?: ArraySchemaOptions,
): JsonArraySchema & { readonly items: I } => getArraySchema(items, options);
export const ref = ($ref: string, options?: RefSchemaOptions): JsonRefSchema =>
  getRefSchema($ref, options);

export type { ContentMediaType } from '../types/schema.types.js';
