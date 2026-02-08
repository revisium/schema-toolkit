import { JsonStringSchema } from '../types/schema.types.js';
import { SystemSchemaIds } from '../consts/system-schema-ids.js';

export const rowHashSchema: JsonStringSchema = {
  type: 'string',
  default: '',
  readOnly: true,
};

export const ajvRowHashSchema = {
  $id: SystemSchemaIds.RowHash,
  ...rowHashSchema,
};
