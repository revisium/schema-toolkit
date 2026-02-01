import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  createObjectNode,
  createArrayNode,
  createStringNode,
  NULL_NODE,
} from '../index.js';
import type { SchemaNode } from '../types.js';

describe('Deep cloning', () => {
  it('clones nested object structure', () => {
    const address = createObjectNode('obj-2', 'address', [
      createStringNode('str-1', 'city'),
      createStringNode('str-2', 'street'),
    ]);
    const user = createObjectNode('obj-1', 'user', [
      createStringNode('str-3', 'name'),
      address,
    ]);

    const cloned = user.clone();

    expect(cloned).not.toBe(user);
    expect(cloned.property('address')).not.toBe(address);
    expect(cloned.property('address').property('city').id()).toBe('str-1');
  });

  it('clones array with object items', () => {
    const itemSchema = createObjectNode('obj-1', 'item', [
      createStringNode('str-1', 'name'),
    ]);
    const arr = createArrayNode('arr-1', 'items', itemSchema);

    const cloned = arr.clone();

    expect(cloned.items()).not.toBe(itemSchema);
    expect(cloned.items().property('name').id()).toBe('str-1');
  });
});

describe('Node navigation', () => {
  let root: SchemaNode;

  beforeEach(() => {
    root = createObjectNode('root', 'root', [
      createStringNode('name-id', 'name'),
      createObjectNode('address-id', 'address', [
        createStringNode('city-id', 'city'),
      ]),
      createArrayNode(
        'tags-id',
        'tags',
        createObjectNode('tag-item-id', 'item', [
          createStringNode('tag-name-id', 'name'),
        ]),
      ),
    ]);
  });

  it('navigates to nested property', () => {
    const city = root.property('address').property('city');

    expect(city.id()).toBe('city-id');
    expect(city.name()).toBe('city');
  });

  it('navigates to array items', () => {
    const tagItem = root.property('tags').items();

    expect(tagItem.id()).toBe('tag-item-id');
  });

  it('navigates to nested array item property', () => {
    const tagName = root.property('tags').items().property('name');

    expect(tagName.id()).toBe('tag-name-id');
  });

  it('returns NULL_NODE for invalid path', () => {
    const result = root.property('missing').property('also-missing');

    expect(result).toBe(NULL_NODE);
  });
});
