import { describe, it, expect } from '@jest/globals';
import { createRefNode, NULL_NODE, EMPTY_METADATA } from '../index.js';

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
});
