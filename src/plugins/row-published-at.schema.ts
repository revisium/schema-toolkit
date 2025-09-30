import { JsonStringSchema, JsonSchemaTypeName } from '../types/schema.types.js';

export const rowPublishedAtSchema: JsonStringSchema = {
  type: JsonSchemaTypeName.String,
  default: '',
};
