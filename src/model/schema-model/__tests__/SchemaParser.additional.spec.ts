import { describe, it, expect } from '@jest/globals';
import { serializeAst } from '@revisium/formula';
import { SchemaParser } from '../SchemaParser.js';
import { createSchemaTree } from '../../../core/schema-tree/index.js';
import type { JsonObjectSchema } from '../../../types/index.js';
import { obj, str, num, bool, arr, ref } from '../../../mocks/schema.mocks.js';

describe('SchemaParser additional coverage', () => {
  const parser = new SchemaParser();

  describe('$ref parsing', () => {
    it('parses schema with $ref', () => {
      const schema = obj({
        file: ref('File'),
      });

      const node = parser.parse(schema);

      const file = node.property('file');
      expect(file.isRef()).toBe(true);
      expect(file.ref()).toBe('File');
    });

    it('parses $ref with metadata', () => {
      const schema = obj({
        image: ref('Image', {
          title: 'Image File',
          description: 'User avatar',
          deprecated: true,
        }),
      });

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
      const schema = obj({
        count: num(),
        isValid: bool({ readOnly: true, formula: 'count > 0' }),
      });

      const rootNode = parser.parse(schema);
      const tree = createSchemaTree(rootNode);
      parser.parseFormulas(tree);

      const isValid = rootNode.property('isValid');
      expect(isValid.nodeType()).toBe('boolean');
      expect(isValid.hasFormula()).toBe(true);
      expect(serializeAst(isValid.formula()!.ast())).toBe('count > 0');
    });
  });

  describe('unknown type error', () => {
    it('throws for unknown schema type', () => {
      const schema = {
        type: 'object',
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
      const schema = obj({
        items: arr(
          obj({
            name: str(),
          }),
        ),
      });

      const node = parser.parse(schema);

      const items = node.property('items');
      expect(items.isArray()).toBe(true);

      const itemsObject = items.items();
      expect(itemsObject.isObject()).toBe(true);
      expect(itemsObject.property('name').nodeType()).toBe('string');
    });
  });
});
