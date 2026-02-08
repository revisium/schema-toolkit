import { JsonStringSchema } from '../types/schema.types.js';
import { SystemSchemaIds } from '../consts/system-schema-ids.js';

export const rowUpdatedAtSchema: JsonStringSchema = {
  type: 'string',
  default: '',
  readOnly: true,
};

export const ajvRowUpdatedAtSchema = {
  $id: SystemSchemaIds.RowUpdatedAt,
  ...rowUpdatedAtSchema,
};
