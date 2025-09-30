import { JsonObjectSchema, JsonSchemaTypeName } from '../types/schema.types.js';

export const fileSchema: JsonObjectSchema = {
  type: JsonSchemaTypeName.Object,
  properties: {
    status: { type: JsonSchemaTypeName.String, default: '', readOnly: true },
    fileId: { type: JsonSchemaTypeName.String, default: '', readOnly: true },
    url: { type: JsonSchemaTypeName.String, default: '', readOnly: true },
    fileName: { type: JsonSchemaTypeName.String, default: '' },
    hash: {
      type: JsonSchemaTypeName.String,
      default: '',
      readOnly: true,
    },
    extension: {
      type: JsonSchemaTypeName.String,
      default: '',
      readOnly: true,
    },
    mimeType: {
      type: JsonSchemaTypeName.String,
      default: '',
      readOnly: true,
    },
    size: {
      type: JsonSchemaTypeName.Number,
      default: 0,
      readOnly: true,
    },
    width: {
      type: JsonSchemaTypeName.Number,
      default: 0,
      readOnly: true,
    },
    height: {
      type: JsonSchemaTypeName.Number,
      default: 0,
      readOnly: true,
    },
  },
  required: [
    'status',
    'fileId',
    'url',
    'fileName',
    'hash',
    'extension',
    'mimeType',
    'size',
    'width',
    'height',
  ],
  additionalProperties: false,
};
