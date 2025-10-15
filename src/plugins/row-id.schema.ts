import { JsonStringSchema, JsonSchemaTypeName } from '../types/schema.types.js';
import { SystemSchemaIds } from '../consts/system-schema-ids.js';

export const rowIdSchema: JsonStringSchema = {
  type: JsonSchemaTypeName.String,
  default: '',
  readOnly: true,
};

export const ajvRowIdSchema = {
  $id: SystemSchemaIds.RowId,
  ...rowIdSchema,
};
