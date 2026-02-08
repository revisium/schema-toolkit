import { JsonObjectSchema } from '../types/schema.types.js';
import { SystemSchemaIds } from '../consts/system-schema-ids.js';

export const fileSchema: JsonObjectSchema = {
  type: 'object',
  properties: {
    status: { type: 'string', default: '', readOnly: true },
    fileId: { type: 'string', default: '', readOnly: true },
    url: { type: 'string', default: '', readOnly: true },
    fileName: { type: 'string', default: '' },
    hash: {
      type: 'string',
      default: '',
      readOnly: true,
    },
    extension: {
      type: 'string',
      default: '',
      readOnly: true,
    },
    mimeType: {
      type: 'string',
      default: '',
      readOnly: true,
    },
    size: {
      type: 'number',
      default: 0,
      readOnly: true,
    },
    width: {
      type: 'number',
      default: 0,
      readOnly: true,
    },
    height: {
      type: 'number',
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

export const ajvFileSchema = {
  $id: SystemSchemaIds.File,
  ...fileSchema,
};
