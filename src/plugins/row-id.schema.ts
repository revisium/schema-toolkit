import { JsonStringSchema } from '../types/schema.types.js';
import { SystemSchemaIds } from '../consts/system-schema-ids.js';

export const rowIdSchema: JsonStringSchema = {
  type: 'string',
  default: '',
  readOnly: true,
};

export const ajvRowIdSchema = {
  $id: SystemSchemaIds.RowId,
  ...rowIdSchema,
};
