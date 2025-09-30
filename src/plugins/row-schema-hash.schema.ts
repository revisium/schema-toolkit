import { JsonStringSchema, JsonSchemaTypeName } from '../types/schema.types.js';

export const rowSchemaHashSchema: JsonStringSchema = {
  type: JsonSchemaTypeName.String,
  default: '',
  readOnly: true,
};
