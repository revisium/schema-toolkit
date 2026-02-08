import { describe, it, expect } from '@jest/globals';
import { serializeAst } from '@revisium/formula';
import { createSchemaTree } from '../../../core/schema-tree/index.js';
import type { JsonObjectSchema, JsonSchema } from '../../../types/index.js';
import { SchemaParser } from '../SchemaParser.js';
import {
  emptySchema,
  simpleSchema,
  nestedSchema,
  arraySchema,
  schemaWithMetadata,
  schemaWithFormula,
  schemaWithForeignKey,
} from './test-helpers.js';

describe('SchemaParser', () => {
  const parser = new SchemaParser();

  describe('basic parsing', () => {
    it('parses empty schema', () => {
      const node = parser.parse(emptySchema());

      expect(node.isObject()).toBe(true);
      expect(node.name()).toBe('root');
      expect(node.properties()).toHaveLength(0);
    });

    it('parses simple schema with primitives', () => {
      const node = parser.parse(simpleSchema());

      expect(node.isObject()).toBe(true);
      expect(node.properties()).toHaveLength(2);

      const props = node.properties();
      const age = props.find((p) => p.name() === 'age');
      const name = props.find((p) => p.name() === 'name');

      expect(age).toBeDefined();
      expect(age?.nodeType()).toBe('number');
      expect(age?.defaultValue()).toBe(0);

      expect(name).toBeDefined();
      expect(name?.nodeType()).toBe('string');
      expect(name?.defaultValue()).toBe('');
    });
  });

  describe('nested objects', () => {
    it('parses nested object schema', () => {
      const node = parser.parse(nestedSchema());

      expect(node.properties()).toHaveLength(1);
      const user = node.property('user');

      expect(user.isObject()).toBe(true);
      expect(user.properties()).toHaveLength(2);

      const firstName = user.property('firstName');
      const lastName = user.property('lastName');

      expect(firstName.nodeType()).toBe('string');
      expect(lastName.nodeType()).toBe('string');
    });
  });

  describe('arrays', () => {
    it('parses array schema', () => {
      const node = parser.parse(arraySchema());

      const items = node.property('items');
      expect(items.isArray()).toBe(true);

      const itemsNode = items.items();
      expect(itemsNode.nodeType()).toBe('string');
    });
  });

  describe('metadata', () => {
    it('parses schema with metadata', () => {
      const node = parser.parse(schemaWithMetadata());

      const field = node.property('field');
      const meta = field.metadata();

      expect(meta.title).toBe('Field Title');
      expect(meta.description).toBe('Field description');
      expect(meta.deprecated).toBe(true);
    });
  });

  describe('formulas', () => {
    it('parses schema with formula', () => {
      const rootNode = parser.parse(schemaWithFormula());
      const tree = createSchemaTree(rootNode);
      parser.parseFormulas(tree);

      const total = rootNode.property('total');
      expect(total.hasFormula()).toBe(true);

      const formula = total.formula();
      expect(formula?.version()).toBe(1);
      expect(serializeAst(formula!.ast())).toBe('price * quantity');
    });
  });

  describe('foreign keys', () => {
    it('parses schema with foreign key', () => {
      const node = parser.parse(schemaWithForeignKey());

      const categoryId = node.property('categoryId');
      expect(categoryId.foreignKey()).toBe('categories');
    });
  });

  describe('unique ids', () => {
    it('generates unique ids for each node', () => {
      const node = parser.parse(simpleSchema());

      const ids = new Set<string>();
      ids.add(node.id());

      for (const prop of node.properties()) {
        expect(ids.has(prop.id())).toBe(false);
        ids.add(prop.id());
      }

      expect(ids.size).toBe(3);
    });
  });

  describe('refSchemas resolution', () => {
    const fileSchema: JsonObjectSchema = {
      type: 'object',
      properties: {
        url: { type: 'string', default: '' },
        size: { type: 'number', default: 0 },
      },
      additionalProperties: false,
      required: ['url', 'size'],
    };

    const refSchemas: Record<string, JsonSchema> = {
      'urn:schema:file': fileSchema,
    };

    it('resolves $ref to object schema when found in refSchemas', () => {
      const schema: JsonObjectSchema = {
        type: 'object',
        properties: {
          image: { $ref: 'urn:schema:file' },
        },
        additionalProperties: false,
        required: ['image'],
      };

      const node = parser.parse(schema, refSchemas);
      const image = node.property('image');

      expect(image.isObject()).toBe(true);
      expect(image.isRef()).toBe(true);
      expect(image.ref()).toBe('urn:schema:file');
      expect(image.properties()).toHaveLength(2);

      const url = image.property('url');
      expect(url.nodeType()).toBe('string');

      const size = image.property('size');
      expect(size.nodeType()).toBe('number');
    });

    it('creates RefNode when $ref is not found in refSchemas', () => {
      const schema: JsonObjectSchema = {
        type: 'object',
        properties: {
          unknown: { $ref: 'urn:schema:unknown' },
        },
        additionalProperties: false,
        required: ['unknown'],
      };

      const node = parser.parse(schema, refSchemas);
      const unknown = node.property('unknown');

      expect(unknown.nodeType()).toBe('ref');
      expect(unknown.isRef()).toBe(true);
      expect(unknown.ref()).toBe('urn:schema:unknown');
      expect(unknown.isObject()).toBe(false);
    });

    it('resolves $ref to array schema', () => {
      const arrayRefSchema: JsonSchema = {
        type: 'array',
        items: { type: 'string', default: '' },
      };

      const schema: JsonObjectSchema = {
        type: 'object',
        properties: {
          tags: { $ref: 'urn:schema:tags' },
        },
        additionalProperties: false,
        required: ['tags'],
      };

      const node = parser.parse(schema, {
        'urn:schema:tags': arrayRefSchema,
      });
      const tags = node.property('tags');

      expect(tags.isArray()).toBe(true);
      expect(tags.isRef()).toBe(true);
      expect(tags.ref()).toBe('urn:schema:tags');

      const items = tags.items();
      expect(items.nodeType()).toBe('string');
    });

    it('resolves $ref to primitive schema', () => {
      const stringRefSchema: JsonSchema = {
        type: 'string',
        default: 'default-value',
      };

      const schema: JsonObjectSchema = {
        type: 'object',
        properties: {
          status: { $ref: 'urn:schema:status' },
        },
        additionalProperties: false,
        required: ['status'],
      };

      const node = parser.parse(schema, {
        'urn:schema:status': stringRefSchema,
      });
      const status = node.property('status');

      expect(status.nodeType()).toBe('string');
      expect(status.isRef()).toBe(true);
      expect(status.ref()).toBe('urn:schema:status');
      expect(status.defaultValue()).toBe('default-value');
    });

    it('preserves metadata from $ref schema', () => {
      const schema: JsonObjectSchema = {
        type: 'object',
        properties: {
          image: {
            $ref: 'urn:schema:file',
            title: 'Image',
            description: 'Product image',
          },
        },
        additionalProperties: false,
        required: ['image'],
      };

      const node = parser.parse(schema, refSchemas);
      const image = node.property('image');

      expect(image.isObject()).toBe(true);
      expect(image.ref()).toBe('urn:schema:file');
    });

    it('does not resolve nested $ref inside resolved schema', () => {
      const nestedRefSchema: JsonObjectSchema = {
        type: 'object',
        properties: {
          nested: { $ref: 'urn:schema:unknown' },
        },
        additionalProperties: false,
        required: ['nested'],
      };

      const schema: JsonObjectSchema = {
        type: 'object',
        properties: {
          wrapper: { $ref: 'urn:schema:wrapper' },
        },
        additionalProperties: false,
        required: ['wrapper'],
      };

      const node = parser.parse(schema, {
        'urn:schema:wrapper': nestedRefSchema,
      });
      const wrapper = node.property('wrapper');

      expect(wrapper.isObject()).toBe(true);
      expect(wrapper.ref()).toBe('urn:schema:wrapper');

      const nested = wrapper.property('nested');
      expect(nested.nodeType()).toBe('ref');
      expect(nested.ref()).toBe('urn:schema:unknown');
    });
  });
});
