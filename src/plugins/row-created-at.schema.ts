import { JsonStringSchema, JsonSchemaTypeName } from '../types/schema.types.js';

export const rowCreatedAtSchema: JsonStringSchema = {
  type: JsonSchemaTypeName.String,
  default: '',
  readOnly: true,
};
