import { describe, it, expect } from '@jest/globals';
import {
  createObjectNode,
  createStringNode,
  createNumberNode,
  NULL_NODE,
  EMPTY_METADATA,
} from '../index.js';
import { createMockFormula } from './test-helpers.js';

describe('ObjectNode', () => {
  it('creates node with id and name', () => {
    const node = createObjectNode('obj-1', 'user');

    expect(node.id()).toBe('obj-1');
    expect(node.name()).toBe('user');
    expect(node.nodeType()).toBe('object');
  });

  it('creates node with explicit empty children', () => {
    const node = createObjectNode('obj-1', 'user', []);

    expect(node.properties()).toHaveLength(0);
  });

  it('creates node with explicit metadata', () => {
    const node = createObjectNode('obj-1', 'user', [], EMPTY_METADATA);

    expect(node.metadata()).toBe(EMPTY_METADATA);
  });

  it('isObject returns true', () => {
    const node = createObjectNode('obj-1', 'user');

    expect(node.isObject()).toBe(true);
    expect(node.isArray()).toBe(false);
    expect(node.isPrimitive()).toBe(false);
    expect(node.isRef()).toBe(false);
    expect(node.isNull()).toBe(false);
  });

  it('manages children via properties', () => {
    const child1 = createStringNode('str-1', 'name');
    const child2 = createNumberNode('num-1', 'age');
    const node = createObjectNode('obj-1', 'user', [child1, child2]);

    expect(node.properties()).toHaveLength(2);
    expect(node.properties()[0]).toBe(child1);
    expect(node.properties()[1]).toBe(child2);
  });

  it('property returns child by name', () => {
    const child = createStringNode('str-1', 'name');
    const node = createObjectNode('obj-1', 'user', [child]);

    expect(node.property('name')).toBe(child);
  });

  it('property returns NULL_NODE for missing child', () => {
    const node = createObjectNode('obj-1', 'user');

    expect(node.property('missing')).toBe(NULL_NODE);
  });

  it('items returns NULL_NODE', () => {
    const node = createObjectNode('obj-1', 'user');

    expect(node.items()).toBe(NULL_NODE);
  });

  it('returns undefined for primitive properties', () => {
    const node = createObjectNode('obj-1', 'user');

    expect(node.ref()).toBeUndefined();
    expect(node.formula()).toBeUndefined();
    expect(node.hasFormula()).toBe(false);
    expect(node.defaultValue()).toBeUndefined();
    expect(node.foreignKey()).toBeUndefined();
  });

  it('clones with children', () => {
    const child = createStringNode('str-1', 'name');
    const node = createObjectNode('obj-1', 'user', [child]);

    const cloned = node.clone();

    expect(cloned.id()).toBe('obj-1');
    expect(cloned.name()).toBe('user');
    expect(cloned.properties()).toHaveLength(1);
    expect(cloned.properties()[0]).not.toBe(child);
    expect(cloned.properties()[0]?.id()).toBe('str-1');
  });

  it('supports metadata', () => {
    const node = createObjectNode('obj-1', 'user', [], {
      title: 'User',
      description: 'A user object',
      deprecated: true,
    });

    expect(node.metadata().title).toBe('User');
    expect(node.metadata().description).toBe('A user object');
    expect(node.metadata().deprecated).toBe(true);
  });

  it('returns EMPTY_METADATA when no metadata provided', () => {
    const node = createObjectNode('obj-1', 'user');

    expect(node.metadata()).toBe(EMPTY_METADATA);
  });

  describe('mutations', () => {
    it('setName changes the name', () => {
      const node = createObjectNode('obj-1', 'oldName');

      node.setName('newName');

      expect(node.name()).toBe('newName');
    });

    it('setMetadata changes metadata', () => {
      const node = createObjectNode('obj-1', 'user');

      node.setMetadata({ description: 'Updated' });

      expect(node.metadata().description).toBe('Updated');
    });

    it('addChild adds a child node', () => {
      const node = createObjectNode('obj-1', 'user');
      const child = createStringNode('str-1', 'name');

      node.addChild(child);

      expect(node.properties()).toHaveLength(1);
      expect(node.property('name')).toBe(child);
    });

    it('removeChild removes existing child', () => {
      const child = createStringNode('str-1', 'name');
      const node = createObjectNode('obj-1', 'user', [child]);

      const result = node.removeChild('name');

      expect(result).toBe(true);
      expect(node.properties()).toHaveLength(0);
    });

    it('removeChild returns false for non-existent child', () => {
      const node = createObjectNode('obj-1', 'user');

      const result = node.removeChild('missing');

      expect(result).toBe(false);
    });

    it('setItems is no-op for object', () => {
      const node = createObjectNode('obj-1', 'user');
      const items = createStringNode('str-1', '');

      node.setItems(items);

      expect(node.items()).toBe(NULL_NODE);
    });

    it('setDefaultValue is no-op for object', () => {
      const node = createObjectNode('obj-1', 'user');

      node.setDefaultValue('test');

      expect(node.defaultValue()).toBeUndefined();
    });

    it('setFormula is no-op for object', () => {
      const node = createObjectNode('obj-1', 'user');

      node.setFormula(createMockFormula(1, 'test'));

      expect(node.formula()).toBeUndefined();
    });

    it('setForeignKey is no-op for object', () => {
      const node = createObjectNode('obj-1', 'user');

      node.setForeignKey('users');

      expect(node.foreignKey()).toBeUndefined();
    });
  });
});
