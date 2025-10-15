import { JsonStringSchema, JsonSchemaTypeName } from '../types/schema.types.js';
import { SystemSchemaIds } from '../consts/system-schema-ids.js';

export const rowCreatedIdSchema: JsonStringSchema = {
  type: JsonSchemaTypeName.String,
  default: '',
  readOnly: true,
};

export const ajvRowCreatedIdSchema = {
  $id: SystemSchemaIds.RowCreatedId,
  ...rowCreatedIdSchema,
};
