import { describe, it, expect } from '@jest/globals';
import {
  createArrayNode,
  createStringNode,
  NULL_NODE,
  EMPTY_METADATA,
} from '../index.js';

describe('ArrayNode', () => {
  it('creates node with id and name', () => {
    const items = createStringNode('str-1', 'item');
    const node = createArrayNode('arr-1', 'tags', items);

    expect(node.id()).toBe('arr-1');
    expect(node.name()).toBe('tags');
    expect(node.nodeType()).toBe('array');
  });

  it('isArray returns true', () => {
    const items = createStringNode('str-1', 'item');
    const node = createArrayNode('arr-1', 'tags', items);

    expect(node.isObject()).toBe(false);
    expect(node.isArray()).toBe(true);
    expect(node.isPrimitive()).toBe(false);
    expect(node.isRef()).toBe(false);
    expect(node.isNull()).toBe(false);
  });

  it('items returns item schema', () => {
    const items = createStringNode('str-1', 'item');
    const node = createArrayNode('arr-1', 'tags', items);

    expect(node.items()).toBe(items);
  });

  it('properties returns items as single-element array', () => {
    const items = createStringNode('str-1', 'item');
    const node = createArrayNode('arr-1', 'tags', items);

    expect(node.properties()).toHaveLength(1);
    expect(node.properties()[0]).toBe(items);
  });

  it('property returns NULL_NODE', () => {
    const items = createStringNode('str-1', 'item');
    const node = createArrayNode('arr-1', 'tags', items);

    expect(node.property('any')).toBe(NULL_NODE);
  });

  it('clones with items', () => {
    const items = createStringNode('str-1', 'item');
    const node = createArrayNode('arr-1', 'tags', items);

    const cloned = node.clone();

    expect(cloned.id()).toBe('arr-1');
    expect(cloned.items()).not.toBe(items);
    expect(cloned.items().id()).toBe('str-1');
  });

  it('returns undefined for primitive properties', () => {
    const items = createStringNode('str-1', 'item');
    const node = createArrayNode('arr-1', 'tags', items);

    expect(node.ref()).toBeUndefined();
    expect(node.formula()).toBeUndefined();
    expect(node.hasFormula()).toBe(false);
    expect(node.defaultValue()).toBeUndefined();
    expect(node.foreignKey()).toBeUndefined();
  });

  it('returns EMPTY_METADATA when no metadata provided', () => {
    const items = createStringNode('str-1', 'item');
    const node = createArrayNode('arr-1', 'tags', items);

    expect(node.metadata()).toBe(EMPTY_METADATA);
  });

  it('supports metadata', () => {
    const items = createStringNode('str-1', 'item');
    const node = createArrayNode('arr-1', 'tags', items, {
      title: 'Tags',
      deprecated: true,
    });

    expect(node.metadata().title).toBe('Tags');
    expect(node.metadata().deprecated).toBe(true);
  });

  it('creates node with explicit EMPTY_METADATA', () => {
    const items = createStringNode('str-1', 'item');
    const node = createArrayNode('arr-1', 'tags', items, EMPTY_METADATA);

    expect(node.metadata()).toBe(EMPTY_METADATA);
  });
});
