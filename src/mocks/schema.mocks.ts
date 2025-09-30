import {
  JsonArraySchema,
  JsonBooleanSchema,
  JsonNumberSchema,
  JsonObjectSchema,
  JsonRefSchema,
  JsonSchema,
  JsonSchemaTypeName,
  JsonStringSchema,
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

export const getStringSchema = (
  params: Partial<JsonStringSchema> = {},
): JsonStringSchema => {
  const schema: JsonStringSchema = {
    type: JsonSchemaTypeName.String,
    default: params.default ?? '',
  };

  if (params.foreignKey) {
    schema.foreignKey = params.foreignKey;
  }

  if (params.readOnly) {
    schema.readOnly = params.readOnly;
  }

  return schema;
};

export const getNumberSchema = (
  defaultValue: number = 0,
  readOnly?: boolean,
): JsonNumberSchema => {
  const schema: JsonNumberSchema = {
    type: JsonSchemaTypeName.Number,
    default: defaultValue,
  };

  if (readOnly) {
    schema.readOnly = readOnly;
  }

  return schema;
};

export const getBooleanSchema = (
  defaultValue: boolean = false,
  readOnly?: boolean,
): JsonBooleanSchema => {
  const schema: JsonBooleanSchema = {
    type: JsonSchemaTypeName.Boolean,
    default: defaultValue,
  };

  if (readOnly) {
    schema.readOnly = readOnly;
  }

  return schema;
};

export const getObjectSchema = (
  properties: Record<string, JsonSchema>,
): JsonObjectSchema => ({
  type: JsonSchemaTypeName.Object,
  additionalProperties: false,
  required: Object.keys(properties).sort((a, b) => a.localeCompare(b)),
  properties,
});

export const getArraySchema = (items: JsonSchema): JsonArraySchema => ({
  type: JsonSchemaTypeName.Array,
  items,
});

export const getRefSchema = ($ref: string): JsonRefSchema => ({
  $ref,
});
