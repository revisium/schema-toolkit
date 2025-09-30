import { JsonStringSchema, JsonSchemaTypeName } from '../types/schema.types.js';

export const rowCreatedIdSchema: JsonStringSchema = {
  type: JsonSchemaTypeName.String,
  default: '',
  readOnly: true,
};
