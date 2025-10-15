import { JsonStringSchema, JsonSchemaTypeName } from '../types/schema.types.js';
import { SystemSchemaIds } from '../consts/system-schema-ids.js';

export const rowSchemaHashSchema: JsonStringSchema = {
  type: JsonSchemaTypeName.String,
  default: '',
  readOnly: true,
};

export const ajvRowSchemaHashSchema = {
  $id: SystemSchemaIds.RowSchemaHash,
  ...rowSchemaHashSchema,
};
