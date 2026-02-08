import { JsonStringSchema } from '../types/schema.types.js';
import { SystemSchemaIds } from '../consts/system-schema-ids.js';

export const rowSchemaHashSchema: JsonStringSchema = {
  type: 'string',
  default: '',
  readOnly: true,
};

export const ajvRowSchemaHashSchema = {
  $id: SystemSchemaIds.RowSchemaHash,
  ...rowSchemaHashSchema,
};
