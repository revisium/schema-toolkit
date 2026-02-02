import { describe, it, expect } from '@jest/globals';
import { createRefNode, NULL_NODE, EMPTY_METADATA } from '../index.js';
import { createMockFormula } from './test-helpers.js';

describe('RefNode', () => {
  it('creates node with id, name and ref', () => {
    const node = createRefNode('ref-1', 'avatar', 'File');

    expect(node.id()).toBe('ref-1');
    expect(node.name()).toBe('avatar');
    expect(node.nodeType()).toBe('ref');
  });

  it('isRef returns true', () => {
    const node = createRefNode('ref-1', 'avatar', 'File');

    expect(node.isObject()).toBe(false);
    expect(node.isArray()).toBe(false);
    expect(node.isPrimitive()).toBe(false);
    expect(node.isRef()).toBe(true);
    expect(node.isNull()).toBe(false);
  });

  it('ref returns reference path', () => {
    const node = createRefNode('ref-1', 'avatar', 'File');

    expect(node.ref()).toBe('File');
  });

  it('properties returns empty array', () => {
    const node = createRefNode('ref-1', 'avatar', 'File');

    expect(node.properties()).toHaveLength(0);
  });

  it('property returns NULL_NODE', () => {
    const node = createRefNode('ref-1', 'avatar', 'File');

    expect(node.property('any')).toBe(NULL_NODE);
  });

  it('items returns NULL_NODE', () => {
    const node = createRefNode('ref-1', 'avatar', 'File');

    expect(node.items()).toBe(NULL_NODE);
  });

  it('clones', () => {
    const node = createRefNode('ref-1', 'avatar', 'File');

    const cloned = node.clone();

    expect(cloned.id()).toBe('ref-1');
    expect(cloned.ref()).toBe('File');
  });

  it('throws on empty ref', () => {
    expect(() => createRefNode('ref-1', 'avatar', '')).toThrow();
  });

  it('returns undefined for primitive properties', () => {
    const node = createRefNode('ref-1', 'avatar', 'File');

    expect(node.formula()).toBeUndefined();
    expect(node.hasFormula()).toBe(false);
    expect(node.defaultValue()).toBeUndefined();
    expect(node.foreignKey()).toBeUndefined();
  });

  it('returns EMPTY_METADATA when no metadata provided', () => {
    const node = createRefNode('ref-1', 'avatar', 'File');

    expect(node.metadata()).toBe(EMPTY_METADATA);
  });

  it('supports metadata', () => {
    const node = createRefNode('ref-1', 'avatar', 'File', {
      title: 'Avatar',
      description: 'User avatar file',
    });

    expect(node.metadata().title).toBe('Avatar');
    expect(node.metadata().description).toBe('User avatar file');
  });

  it('creates node with explicit EMPTY_METADATA', () => {
    const node = createRefNode('ref-1', 'avatar', 'File', EMPTY_METADATA);

    expect(node.metadata()).toBe(EMPTY_METADATA);
  });

  describe('mutations', () => {
    it('setName changes the name', () => {
      const node = createRefNode('ref-1', 'oldName', 'File');

      node.setName('newName');

      expect(node.name()).toBe('newName');
    });

    it('setMetadata changes metadata', () => {
      const node = createRefNode('ref-1', 'avatar', 'File');

      node.setMetadata({ description: 'Updated' });

      expect(node.metadata().description).toBe('Updated');
    });

    it('addChild is no-op for ref', () => {
      const node = createRefNode('ref-1', 'avatar', 'File');

      node.addChild(createRefNode('ref-2', 'child', 'File'));

      expect(node.properties()).toHaveLength(0);
    });

    it('removeChild returns false for ref', () => {
      const node = createRefNode('ref-1', 'avatar', 'File');

      const result = node.removeChild('any');

      expect(result).toBe(false);
    });

    it('setItems is no-op for ref', () => {
      const node = createRefNode('ref-1', 'avatar', 'File');

      node.setItems(createRefNode('ref-2', '', 'File'));

      expect(node.items()).toBe(NULL_NODE);
    });

    it('setDefaultValue is no-op for ref', () => {
      const node = createRefNode('ref-1', 'avatar', 'File');

      node.setDefaultValue('test');

      expect(node.defaultValue()).toBeUndefined();
    });

    it('setFormula is no-op for ref', () => {
      const node = createRefNode('ref-1', 'avatar', 'File');

      node.setFormula(createMockFormula(1, 'test'));

      expect(node.formula()).toBeUndefined();
    });

    it('setForeignKey is no-op for ref', () => {
      const node = createRefNode('ref-1', 'avatar', 'File');

      node.setForeignKey('users');

      expect(node.foreignKey()).toBeUndefined();
    });
  });
});
