import { JsonStringSchema, JsonSchemaTypeName } from '../types/schema.types.js';
import { SystemSchemaIds } from '../consts/system-schema-ids.js';

export const rowPublishedAtSchema: JsonStringSchema = {
  type: JsonSchemaTypeName.String,
  default: '',
};

export const ajvRowPublishedAtSchema = {
  $id: SystemSchemaIds.RowPublishedAt,
  ...rowPublishedAtSchema,
};
