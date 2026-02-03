import { describe, it, expect } from '@jest/globals';
import { JsonSchemaTypeName, type JsonSchema } from '../../../types/schema.types.js';
import { generateDefaultValue } from '../generateDefaultValue.js';

describe('generateDefaultValue', () => {
  describe('primitives', () => {
    describe('string', () => {
      it('returns empty string without default', () => {
        const schema: JsonSchema = {
          type: JsonSchemaTypeName.String,
          default: '',
        };

        const result = generateDefaultValue(schema);

        expect(result).toBe('');
      });

      it('returns schema default when provided', () => {
        const schema: JsonSchema = {
          type: JsonSchemaTypeName.String,
          default: 'hello',
        };

        const result = generateDefaultValue(schema);

        expect(result).toBe('hello');
      });
    });

    describe('number', () => {
      it('returns 0 without default', () => {
        const schema: JsonSchema = {
          type: JsonSchemaTypeName.Number,
          default: 0,
        };

        const result = generateDefaultValue(schema);

        expect(result).toBe(0);
      });

      it('returns schema default when provided', () => {
        const schema: JsonSchema = {
          type: JsonSchemaTypeName.Number,
          default: 42,
        };

        const result = generateDefaultValue(schema);

        expect(result).toBe(42);
      });
    });

    describe('boolean', () => {
      it('returns false without default', () => {
        const schema: JsonSchema = {
          type: JsonSchemaTypeName.Boolean,
          default: false,
        };

        const result = generateDefaultValue(schema);

        expect(result).toBe(false);
      });

      it('returns schema default when provided', () => {
        const schema: JsonSchema = {
          type: JsonSchemaTypeName.Boolean,
          default: true,
        };

        const result = generateDefaultValue(schema);

        expect(result).toBe(true);
      });
    });
  });

  describe('object', () => {
    it('returns empty object for empty schema', () => {
      const schema: JsonSchema = {
        type: JsonSchemaTypeName.Object,
        additionalProperties: false,
        required: [],
        properties: {},
      };

      const result = generateDefaultValue(schema);

      expect(result).toEqual({});
    });

    it('generates defaults for properties', () => {
      const schema: JsonSchema = {
        type: JsonSchemaTypeName.Object,
        additionalProperties: false,
        required: ['name', 'age'],
        properties: {
          name: { type: JsonSchemaTypeName.String, default: '' },
          age: { type: JsonSchemaTypeName.Number, default: 0 },
        },
      };

      const result = generateDefaultValue(schema);

      expect(result).toEqual({ name: '', age: 0 });
    });

    it('uses property defaults', () => {
      const schema: JsonSchema = {
        type: JsonSchemaTypeName.Object,
        additionalProperties: false,
        required: ['name', 'age'],
        properties: {
          name: { type: JsonSchemaTypeName.String, default: 'Unknown' },
          age: { type: JsonSchemaTypeName.Number, default: 18 },
        },
      };

      const result = generateDefaultValue(schema);

      expect(result).toEqual({ name: 'Unknown', age: 18 });
    });

    it('handles nested objects recursively', () => {
      const schema: JsonSchema = {
        type: JsonSchemaTypeName.Object,
        additionalProperties: false,
        required: ['address'],
        properties: {
          address: {
            type: JsonSchemaTypeName.Object,
            additionalProperties: false,
            required: ['city', 'zip'],
            properties: {
              city: { type: JsonSchemaTypeName.String, default: 'NYC' },
              zip: { type: JsonSchemaTypeName.String, default: '' },
            },
          },
        },
      };

      const result = generateDefaultValue(schema);

      expect(result).toEqual({
        address: { city: 'NYC', zip: '' },
      });
    });
  });

  describe('array', () => {
    it('returns empty array without arrayItemCount', () => {
      const schema: JsonSchema = {
        type: JsonSchemaTypeName.Array,
        items: { type: JsonSchemaTypeName.String, default: '' },
      };

      const result = generateDefaultValue(schema);

      expect(result).toEqual([]);
    });

    it('returns empty array with arrayItemCount 0', () => {
      const schema: JsonSchema = {
        type: JsonSchemaTypeName.Array,
        items: { type: JsonSchemaTypeName.String, default: '' },
      };

      const result = generateDefaultValue(schema, { arrayItemCount: 0 });

      expect(result).toEqual([]);
    });

    it('generates one element with arrayItemCount 1', () => {
      const schema: JsonSchema = {
        type: JsonSchemaTypeName.Array,
        items: { type: JsonSchemaTypeName.String, default: '' },
      };

      const result = generateDefaultValue(schema, { arrayItemCount: 1 });

      expect(result).toEqual(['']);
    });

    it('generates multiple elements with arrayItemCount', () => {
      const schema: JsonSchema = {
        type: JsonSchemaTypeName.Array,
        items: { type: JsonSchemaTypeName.String, default: 'item' },
      };

      const result = generateDefaultValue(schema, { arrayItemCount: 3 });

      expect(result).toEqual(['item', 'item', 'item']);
    });

    it('generates object items with defaults', () => {
      const schema: JsonSchema = {
        type: JsonSchemaTypeName.Array,
        items: {
          type: JsonSchemaTypeName.Object,
          additionalProperties: false,
          required: ['id'],
          properties: {
            id: { type: JsonSchemaTypeName.String, default: '' },
          },
        },
      };

      const result = generateDefaultValue(schema, { arrayItemCount: 2 });

      expect(result).toEqual([{ id: '' }, { id: '' }]);
    });

    it('creates independent object instances', () => {
      const schema: JsonSchema = {
        type: JsonSchemaTypeName.Array,
        items: {
          type: JsonSchemaTypeName.Object,
          additionalProperties: false,
          required: ['id'],
          properties: {
            id: { type: JsonSchemaTypeName.String, default: '' },
          },
        },
      };

      const result = generateDefaultValue(schema, { arrayItemCount: 2 }) as object[];

      expect(result[0]).not.toBe(result[1]);
    });

    it('applies arrayItemCount to nested arrays', () => {
      const schema: JsonSchema = {
        type: JsonSchemaTypeName.Object,
        additionalProperties: false,
        required: ['matrix'],
        properties: {
          matrix: {
            type: JsonSchemaTypeName.Array,
            items: {
              type: JsonSchemaTypeName.Array,
              items: { type: JsonSchemaTypeName.Number, default: 0 },
            },
          },
        },
      };

      const result = generateDefaultValue(schema, { arrayItemCount: 2 });

      expect(result).toEqual({
        matrix: [
          [0, 0],
          [0, 0],
        ],
      });
    });
  });

  describe('$ref', () => {
    it('resolves ref and generates default', () => {
      const schema: JsonSchema = { $ref: 'File' };

      const result = generateDefaultValue(schema, {
        refSchemas: {
          File: {
            type: JsonSchemaTypeName.Object,
            additionalProperties: false,
            required: ['fileId', 'url'],
            properties: {
              fileId: { type: JsonSchemaTypeName.String, default: '' },
              url: { type: JsonSchemaTypeName.String, default: '' },
            },
          },
        },
      });

      expect(result).toEqual({ fileId: '', url: '' });
    });

    it('returns empty object without refSchemas', () => {
      const schema: JsonSchema = { $ref: 'File' };

      const result = generateDefaultValue(schema);

      expect(result).toEqual({});
    });

    it('returns empty object for unknown ref', () => {
      const schema: JsonSchema = { $ref: 'Unknown' };

      const result = generateDefaultValue(schema, {
        refSchemas: {
          File: {
            type: JsonSchemaTypeName.Object,
            additionalProperties: false,
            required: [],
            properties: {},
          },
        },
      });

      expect(result).toEqual({});
    });

    it('handles nested refs', () => {
      const schema: JsonSchema = {
        type: JsonSchemaTypeName.Object,
        additionalProperties: false,
        required: ['image'],
        properties: {
          image: { $ref: 'File' },
        },
      };

      const result = generateDefaultValue(schema, {
        refSchemas: {
          File: {
            type: JsonSchemaTypeName.Object,
            additionalProperties: false,
            required: ['url'],
            properties: {
              url: { type: JsonSchemaTypeName.String, default: '' },
            },
          },
        },
      });

      expect(result).toEqual({
        image: { url: '' },
      });
    });

    it('handles array of refs', () => {
      const schema: JsonSchema = {
        type: JsonSchemaTypeName.Array,
        items: { $ref: 'Tag' },
      };

      const result = generateDefaultValue(schema, {
        arrayItemCount: 2,
        refSchemas: {
          Tag: {
            type: JsonSchemaTypeName.Object,
            additionalProperties: false,
            required: ['name'],
            properties: {
              name: { type: JsonSchemaTypeName.String, default: '' },
            },
          },
        },
      });

      expect(result).toEqual([{ name: '' }, { name: '' }]);
    });
  });

  describe('edge cases', () => {
    it('returns empty object for null schema', () => {
      const result = generateDefaultValue(null);

      expect(result).toEqual({});
    });

    it('returns empty object for undefined schema', () => {
      const result = generateDefaultValue(undefined);

      expect(result).toEqual({});
    });

    it('returns empty string for string without default in schema', () => {
      const schema = { type: JsonSchemaTypeName.String } as JsonSchema;

      const result = generateDefaultValue(schema);

      expect(result).toBe('');
    });

    it('returns 0 for number without default in schema', () => {
      const schema = { type: JsonSchemaTypeName.Number } as JsonSchema;

      const result = generateDefaultValue(schema);

      expect(result).toBe(0);
    });

    it('returns false for boolean without default in schema', () => {
      const schema = { type: JsonSchemaTypeName.Boolean } as JsonSchema;

      const result = generateDefaultValue(schema);

      expect(result).toBe(false);
    });

    it('returns undefined for schema without type', () => {
      const schema = {} as JsonSchema;

      const result = generateDefaultValue(schema);

      expect(result).toBeUndefined();
    });

    it('returns empty object for object without properties', () => {
      const schema: JsonSchema = {
        type: JsonSchemaTypeName.Object,
        additionalProperties: false,
        required: [],
      } as unknown as JsonSchema;

      const result = generateDefaultValue(schema);

      expect(result).toEqual({});
    });

    it('returns undefined for unknown type', () => {
      const schema = { type: 'unknown' } as unknown as JsonSchema;

      const result = generateDefaultValue(schema);

      expect(result).toBeUndefined();
    });

    it('handles complex nested structure', () => {
      const schema: JsonSchema = {
        type: JsonSchemaTypeName.Object,
        additionalProperties: false,
        required: ['user', 'tags', 'metadata'],
        properties: {
          user: {
            type: JsonSchemaTypeName.Object,
            additionalProperties: false,
            required: ['name', 'contacts'],
            properties: {
              name: { type: JsonSchemaTypeName.String, default: '' },
              contacts: {
                type: JsonSchemaTypeName.Array,
                items: {
                  type: JsonSchemaTypeName.Object,
                  additionalProperties: false,
                  required: ['type', 'value'],
                  properties: {
                    type: { type: JsonSchemaTypeName.String, default: 'email' },
                    value: { type: JsonSchemaTypeName.String, default: '' },
                  },
                },
              },
            },
          },
          tags: {
            type: JsonSchemaTypeName.Array,
            items: { type: JsonSchemaTypeName.String, default: '' },
          },
          metadata: {
            type: JsonSchemaTypeName.Object,
            additionalProperties: false,
            required: ['active'],
            properties: {
              active: { type: JsonSchemaTypeName.Boolean, default: true },
            },
          },
        },
      };

      const result = generateDefaultValue(schema, { arrayItemCount: 1 });

      expect(result).toEqual({
        user: {
          name: '',
          contacts: [{ type: 'email', value: '' }],
        },
        tags: [''],
        metadata: { active: true },
      });
    });
  });
});
