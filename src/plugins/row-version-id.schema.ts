import { JsonStringSchema } from '../types/schema.types.js';
import { SystemSchemaIds } from '../consts/system-schema-ids.js';

export const rowVersionIdSchema: JsonStringSchema = {
  type: 'string',
  default: '',
  readOnly: true,
};

export const ajvRowVersionIdSchema = {
  $id: SystemSchemaIds.RowVersionId,
  ...rowVersionIdSchema,
};
