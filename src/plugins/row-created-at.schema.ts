import { JsonStringSchema } from '../types/schema.types.js';
import { SystemSchemaIds } from '../consts/system-schema-ids.js';

export const rowCreatedAtSchema: JsonStringSchema = {
  type: 'string',
  default: '',
  readOnly: true,
};

export const ajvRowCreatedAtSchema = {
  $id: SystemSchemaIds.RowCreatedAt,
  ...rowCreatedAtSchema,
};
