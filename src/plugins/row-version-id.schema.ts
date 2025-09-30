import { JsonStringSchema, JsonSchemaTypeName } from '../types/schema.types.js';

export const rowVersionIdSchema: JsonStringSchema = {
  type: JsonSchemaTypeName.String,
  default: '',
  readOnly: true,
};
