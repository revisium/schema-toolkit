import { describe, it, expect } from '@jest/globals';
import { SchemaParser } from '../SchemaParser.js';
import type { JsonObjectSchema, JsonBooleanSchema } from '../../../types/index.js';
import { JsonSchemaTypeName } from '../../../types/index.js';

describe('SchemaParser additional coverage', () => {
  const parser = new SchemaParser();

  describe('$ref parsing', () => {
    it('parses schema with $ref', () => {
      const schema: JsonObjectSchema = {
        type: JsonSchemaTypeName.Object,
        additionalProperties: false,
        required: ['file'],
        properties: {
          file: {
            $ref: 'File',
          },
        },
      };

      const node = parser.parse(schema);

      const file = node.property('file');
      expect(file.isRef()).toBe(true);
      expect(file.ref()).toBe('File');
    });

    it('parses $ref with metadata', () => {
      const schema: JsonObjectSchema = {
        type: JsonSchemaTypeName.Object,
        additionalProperties: false,
        required: ['image'],
        properties: {
          image: {
            $ref: 'Image',
            title: 'Image File',
            description: 'User avatar',
            deprecated: true,
          },
        },
      };

      const node = parser.parse(schema);

      const image = node.property('image');
      expect(image.isRef()).toBe(true);
      expect(image.metadata().title).toBe('Image File');
      expect(image.metadata().description).toBe('User avatar');
      expect(image.metadata().deprecated).toBe(true);
    });
  });

  describe('boolean with formula', () => {
    it('parses boolean field with formula', () => {
      const schema: JsonObjectSchema = {
        type: JsonSchemaTypeName.Object,
        additionalProperties: false,
        required: ['isValid'],
        properties: {
          isValid: {
            type: JsonSchemaTypeName.Boolean,
            default: false,
            readOnly: true,
            'x-formula': {
              version: 1,
              expression: 'count > 0',
            },
          } as JsonBooleanSchema,
        },
      };

      const node = parser.parse(schema);

      const isValid = node.property('isValid');
      expect(isValid.nodeType()).toBe('boolean');
      expect(isValid.hasFormula()).toBe(true);
      expect(isValid.formula()?.expression).toBe('count > 0');
    });
  });

  describe('unknown type error', () => {
    it('throws for unknown schema type', () => {
      const schema = {
        type: JsonSchemaTypeName.Object,
        additionalProperties: false,
        required: ['field'],
        properties: {
          field: {
            type: 'unknown-type',
            default: '',
          },
        },
      } as unknown as JsonObjectSchema;

      expect(() => parser.parse(schema)).toThrow('Unknown schema type: unknown-type');
    });
  });

  describe('nested arrays', () => {
    it('parses nested array with object items', () => {
      const schema: JsonObjectSchema = {
        type: JsonSchemaTypeName.Object,
        additionalProperties: false,
        required: ['items'],
        properties: {
          items: {
            type: JsonSchemaTypeName.Array,
            items: {
              type: JsonSchemaTypeName.Object,
              additionalProperties: false,
              required: ['name'],
              properties: {
                name: {
                  type: JsonSchemaTypeName.String,
                  default: '',
                },
              },
            },
          },
        },
      };

      const node = parser.parse(schema);

      const items = node.property('items');
      expect(items.isArray()).toBe(true);

      const itemsObject = items.items();
      expect(itemsObject.isObject()).toBe(true);
      expect(itemsObject.property('name').nodeType()).toBe('string');
    });
  });
});
