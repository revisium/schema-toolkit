import { describe, it, expect } from '@jest/globals';
import { createSchemaTree } from '../index.js';
import {
  createObjectNode,
  createArrayNode,
  createStringNode,
  createNumberNode,
  NULL_NODE,
} from '../../schema-node/index.js';

describe('SchemaTree.replaceRoot', () => {
  it('replaces object root with array', () => {
    const nameNode = createStringNode('name-id', 'name');
    const root = createObjectNode('root-id', 'root', [nameNode]);
    const tree = createSchemaTree(root);

    const itemNode = createStringNode('item-id', '');
    const newRoot = createArrayNode('new-root-id', 'root', itemNode);

    tree.replaceRoot(newRoot);

    expect(tree.root()).toBe(newRoot);
    expect(tree.root().id()).toBe('new-root-id');
    expect(tree.root().isArray()).toBe(true);
  });

  it('replaces array root with object', () => {
    const itemNode = createStringNode('item-id', '');
    const root = createArrayNode('root-id', 'root', itemNode);
    const tree = createSchemaTree(root);

    const nameNode = createStringNode('name-id', 'name');
    const newRoot = createObjectNode('new-root-id', 'root', [nameNode]);

    tree.replaceRoot(newRoot);

    expect(tree.root()).toBe(newRoot);
    expect(tree.root().id()).toBe('new-root-id');
    expect(tree.root().isObject()).toBe(true);
  });

  it('rebuilds index after replacement', () => {
    const nameNode = createStringNode('name-id', 'name');
    const root = createObjectNode('root-id', 'root', [nameNode]);
    const tree = createSchemaTree(root);

    const cityNode = createStringNode('city-id', 'city');
    const addressNode = createObjectNode('address-id', 'address', [cityNode]);
    const newRoot = createObjectNode('new-root-id', 'root', [addressNode]);

    tree.replaceRoot(newRoot);

    expect(tree.nodeById('new-root-id')).toBe(newRoot);
    expect(tree.nodeById('address-id')).toBe(addressNode);
    expect(tree.nodeById('city-id')).toBe(cityNode);
    expect(tree.pathOf('city-id').asJsonPointer()).toBe(
      '/properties/address/properties/city',
    );
  });

  it('old nodes are no longer accessible after replacement', () => {
    const nameNode = createStringNode('name-id', 'name');
    const root = createObjectNode('root-id', 'root', [nameNode]);
    const tree = createSchemaTree(root);

    const itemNode = createStringNode('item-id', '');
    const newRoot = createArrayNode('new-root-id', 'root', itemNode);

    tree.replaceRoot(newRoot);

    expect(tree.nodeById('root-id')).toBe(NULL_NODE);
    expect(tree.nodeById('name-id')).toBe(NULL_NODE);
  });

  it('correctly counts nodes after replacement', () => {
    const nameNode = createStringNode('name-id', 'name');
    const ageNode = createNumberNode('age-id', 'age');
    const root = createObjectNode('root-id', 'root', [nameNode, ageNode]);
    const tree = createSchemaTree(root);

    expect(tree.countNodes()).toBe(3);

    const itemNode = createStringNode('item-id', '');
    const newRoot = createArrayNode('new-root-id', 'root', itemNode);

    tree.replaceRoot(newRoot);

    expect(tree.countNodes()).toBe(2);
  });

  it('nodeIds returns new node ids after replacement', () => {
    const nameNode = createStringNode('name-id', 'name');
    const root = createObjectNode('root-id', 'root', [nameNode]);
    const tree = createSchemaTree(root);

    const cityNode = createStringNode('city-id', 'city');
    const newRoot = createObjectNode('new-root-id', 'root', [cityNode]);

    tree.replaceRoot(newRoot);

    const ids = [...tree.nodeIds()];
    expect(ids).toContain('new-root-id');
    expect(ids).toContain('city-id');
    expect(ids).not.toContain('root-id');
    expect(ids).not.toContain('name-id');
  });

  it('preserves replacements map after root replacement', () => {
    const root = createObjectNode('root-id', 'root');
    const tree = createSchemaTree(root);
    tree.trackReplacement('old-id', 'replaced-id');

    const newRoot = createObjectNode('new-root-id', 'root');
    tree.replaceRoot(newRoot);

    const replacements = [...tree.replacements()];
    expect(replacements).toContainEqual(['old-id', 'replaced-id']);
  });
});
