import { describe, it, expect } from '@jest/globals';
import type { JsonSchema } from '../../../types/schema.types.js';
import { generateDefaultValue } from '../generateDefaultValue.js';
import { obj, str, num, bool, arr, ref } from '../../../mocks/schema.mocks.js';

describe('generateDefaultValue', () => {
  describe('primitives', () => {
    describe('string', () => {
      it('returns empty string without default', () => {
        const result = generateDefaultValue(str());

        expect(result).toBe('');
      });

      it('returns schema default when provided', () => {
        const result = generateDefaultValue(str({ default: 'hello' }));

        expect(result).toBe('hello');
      });
    });

    describe('number', () => {
      it('returns 0 without default', () => {
        const result = generateDefaultValue(num());

        expect(result).toBe(0);
      });

      it('returns schema default when provided', () => {
        const result = generateDefaultValue(num({ default: 42 }));

        expect(result).toBe(42);
      });
    });

    describe('boolean', () => {
      it('returns false without default', () => {
        const result = generateDefaultValue(bool());

        expect(result).toBe(false);
      });

      it('returns schema default when provided', () => {
        const result = generateDefaultValue(bool({ default: true }));

        expect(result).toBe(true);
      });
    });
  });

  describe('object', () => {
    it('returns empty object for empty schema', () => {
      const result = generateDefaultValue(obj({}));

      expect(result).toEqual({});
    });

    it('generates defaults for properties', () => {
      const schema = obj({
        name: str(),
        age: num(),
      });

      const result = generateDefaultValue(schema);

      expect(result).toEqual({ name: '', age: 0 });
    });

    it('uses property defaults', () => {
      const schema = obj({
        name: str({ default: 'Unknown' }),
        age: num({ default: 18 }),
      });

      const result = generateDefaultValue(schema);

      expect(result).toEqual({ name: 'Unknown', age: 18 });
    });

    it('handles nested objects recursively', () => {
      const schema = obj({
        address: obj({
          city: str({ default: 'NYC' }),
          zip: str(),
        }),
      });

      const result = generateDefaultValue(schema);

      expect(result).toEqual({
        address: { city: 'NYC', zip: '' },
      });
    });
  });

  describe('array', () => {
    it('returns empty array without arrayItemCount', () => {
      const result = generateDefaultValue(arr(str()));

      expect(result).toEqual([]);
    });

    it('returns empty array with arrayItemCount 0', () => {
      const result = generateDefaultValue(arr(str()), { arrayItemCount: 0 });

      expect(result).toEqual([]);
    });

    it('generates one element with arrayItemCount 1', () => {
      const result = generateDefaultValue(arr(str()), { arrayItemCount: 1 });

      expect(result).toEqual(['']);
    });

    it('generates multiple elements with arrayItemCount', () => {
      const result = generateDefaultValue(arr(str({ default: 'item' })), { arrayItemCount: 3 });

      expect(result).toEqual(['item', 'item', 'item']);
    });

    it('generates object items with defaults', () => {
      const schema = arr(
        obj({
          id: str(),
        }),
      );

      const result = generateDefaultValue(schema, { arrayItemCount: 2 });

      expect(result).toEqual([{ id: '' }, { id: '' }]);
    });

    it('creates independent object instances', () => {
      const schema = arr(
        obj({
          id: str(),
        }),
      );

      const result = generateDefaultValue(schema, { arrayItemCount: 2 }) as object[];

      expect(result[0]).not.toBe(result[1]);
    });

    it('applies arrayItemCount to nested arrays', () => {
      const schema = obj({
        matrix: arr(arr(num())),
      });

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
          File: obj({
            fileId: str(),
            url: str(),
          }),
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
          File: obj({}),
        },
      });

      expect(result).toEqual({});
    });

    it('handles nested refs', () => {
      const schema = obj({
        image: ref('File'),
      });

      const result = generateDefaultValue(schema, {
        refSchemas: {
          File: obj({
            url: str(),
          }),
        },
      });

      expect(result).toEqual({
        image: { url: '' },
      });
    });

    it('handles array of refs', () => {
      const schema = arr(ref('Tag'));

      const result = generateDefaultValue(schema, {
        arrayItemCount: 2,
        refSchemas: {
          Tag: obj({
            name: str(),
          }),
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
      const schema = { type: 'string' } as JsonSchema;

      const result = generateDefaultValue(schema);

      expect(result).toBe('');
    });

    it('returns 0 for number without default in schema', () => {
      const schema = { type: 'number' } as JsonSchema;

      const result = generateDefaultValue(schema);

      expect(result).toBe(0);
    });

    it('returns false for boolean without default in schema', () => {
      const schema = { type: 'boolean' } as JsonSchema;

      const result = generateDefaultValue(schema);

      expect(result).toBe(false);
    });

    it('returns undefined for schema without type', () => {
      const schema = {} as JsonSchema;

      const result = generateDefaultValue(schema);

      expect(result).toBeUndefined();
    });

    it('returns empty object for object without properties', () => {
      const schema = {
        type: 'object',
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
      const schema = obj({
        user: obj({
          name: str(),
          contacts: arr(
            obj({
              type: str({ default: 'email' }),
              value: str(),
            }),
          ),
        }),
        tags: arr(str()),
        metadata: obj({
          active: bool({ default: true }),
        }),
      });

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
