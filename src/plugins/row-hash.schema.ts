import { JsonStringSchema, JsonSchemaTypeName } from '../types/schema.types.js';

export const rowHashSchema: JsonStringSchema = {
  type: JsonSchemaTypeName.String,
  default: '',
  readOnly: true,
};
