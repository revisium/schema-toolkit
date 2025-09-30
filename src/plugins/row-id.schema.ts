import { JsonStringSchema, JsonSchemaTypeName } from '../types/schema.types.js';

export const rowIdSchema: JsonStringSchema = {
  type: JsonSchemaTypeName.String,
  default: '',
  readOnly: true,
};
