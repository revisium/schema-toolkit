import { JsonStringSchema, JsonSchemaTypeName } from '../types/schema.types.js';

export const rowUpdatedAtSchema: JsonStringSchema = {
  type: JsonSchemaTypeName.String,
  default: '',
  readOnly: true,
};
