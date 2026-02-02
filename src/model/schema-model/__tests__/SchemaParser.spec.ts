import { describe, it, expect } from '@jest/globals';
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
      const node = parser.parse(schemaWithFormula());

      const total = node.property('total');
      expect(total.hasFormula()).toBe(true);

      const formula = total.formula();
      expect(formula?.version).toBe(1);
      expect(formula?.expression).toBe('price * quantity');
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
});
