import { JsonStringSchema } from '../types/schema.types.js';
import { SystemSchemaIds } from '../consts/system-schema-ids.js';

export const rowPublishedAtSchema: JsonStringSchema = {
  type: 'string',
  default: '',
};

export const ajvRowPublishedAtSchema = {
  $id: SystemSchemaIds.RowPublishedAt,
  ...rowPublishedAtSchema,
};
