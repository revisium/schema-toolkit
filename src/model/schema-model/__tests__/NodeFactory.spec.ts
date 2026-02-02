import { describe, it, expect } from '@jest/globals';
import { NodeFactory } from '../NodeFactory.js';

describe('NodeFactory', () => {
  const factory = new NodeFactory();

  describe('createNode', () => {
    it('creates string node with default value', () => {
      const node = factory.createNode('field', 'string');

      expect(node.nodeType()).toBe('string');
      expect(node.name()).toBe('field');
      expect(node.defaultValue()).toBe('');
    });

    it('creates number node with default value', () => {
      const node = factory.createNode('count', 'number');

      expect(node.nodeType()).toBe('number');
      expect(node.name()).toBe('count');
      expect(node.defaultValue()).toBe(0);
    });

    it('creates boolean node with default value', () => {
      const node = factory.createNode('active', 'boolean');

      expect(node.nodeType()).toBe('boolean');
      expect(node.name()).toBe('active');
      expect(node.defaultValue()).toBe(false);
    });

    it('creates empty object node', () => {
      const node = factory.createNode('nested', 'object');

      expect(node.isObject()).toBe(true);
      expect(node.name()).toBe('nested');
      expect(node.properties()).toHaveLength(0);
    });

    it('creates array node with string items', () => {
      const node = factory.createNode('list', 'array');

      expect(node.isArray()).toBe(true);
      expect(node.name()).toBe('list');

      const items = node.items();
      expect(items.nodeType()).toBe('string');
      expect(items.name()).toBe('items');
    });

    it('throws for unknown type', () => {
      expect(() => {
        factory.createNode('field', 'unknown' as never);
      }).toThrow('Unknown field type: unknown');
    });

    it('generates unique ids for each node', () => {
      const node1 = factory.createNode('field1', 'string');
      const node2 = factory.createNode('field2', 'string');

      expect(node1.id()).not.toBe(node2.id());
    });
  });
});
