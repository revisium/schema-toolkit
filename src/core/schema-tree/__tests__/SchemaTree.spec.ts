import { describe, it, expect } from '@jest/globals';
import { createSchemaTree } from '../index.js';
import {
  createObjectNode,
  createArrayNode,
  createStringNode,
  createNumberNode,
  NULL_NODE,
} from '../../schema-node/index.js';
import { jsonPointerToPath, EMPTY_PATH } from '../../path/index.js';

describe('SchemaTree', () => {
  describe('root', () => {
    it('returns root node', () => {
      const root = createObjectNode('root-id', 'root', [
        createStringNode('name-id', 'name'),
      ]);
      const tree = createSchemaTree(root);

      expect(tree.root()).toBe(root);
    });
  });

  describe('nodeById', () => {
    it('returns node by id', () => {
      const nameNode = createStringNode('name-id', 'name');
      const root = createObjectNode('root-id', 'root', [nameNode]);
      const tree = createSchemaTree(root);

      expect(tree.nodeById('name-id')).toBe(nameNode);
    });

    it('returns root by id', () => {
      const root = createObjectNode('root-id', 'root');
      const tree = createSchemaTree(root);

      expect(tree.nodeById('root-id')).toBe(root);
    });

    it('returns NULL_NODE for unknown id', () => {
      const root = createObjectNode('root-id', 'root');
      const tree = createSchemaTree(root);

      expect(tree.nodeById('unknown')).toBe(NULL_NODE);
    });

    it('finds nested nodes', () => {
      const cityNode = createStringNode('city-id', 'city');
      const addressNode = createObjectNode('address-id', 'address', [cityNode]);
      const root = createObjectNode('root-id', 'root', [addressNode]);
      const tree = createSchemaTree(root);

      expect(tree.nodeById('city-id')).toBe(cityNode);
      expect(tree.nodeById('address-id')).toBe(addressNode);
    });

    it('finds array items', () => {
      const itemNode = createStringNode('item-id', 'item');
      const tagsNode = createArrayNode('tags-id', 'tags', itemNode);
      const root = createObjectNode('root-id', 'root', [tagsNode]);
      const tree = createSchemaTree(root);

      expect(tree.nodeById('item-id')).toBe(itemNode);
    });
  });

  describe('pathOf', () => {
    it('returns EMPTY_PATH for root', () => {
      const root = createObjectNode('root-id', 'root');
      const tree = createSchemaTree(root);

      expect(tree.pathOf('root-id').isEmpty()).toBe(true);
    });

    it('returns path for direct child', () => {
      const nameNode = createStringNode('name-id', 'name');
      const root = createObjectNode('root-id', 'root', [nameNode]);
      const tree = createSchemaTree(root);

      const path = tree.pathOf('name-id');
      expect(path.asJsonPointer()).toBe('/properties/name');
    });

    it('returns path for nested child', () => {
      const cityNode = createStringNode('city-id', 'city');
      const addressNode = createObjectNode('address-id', 'address', [cityNode]);
      const root = createObjectNode('root-id', 'root', [addressNode]);
      const tree = createSchemaTree(root);

      expect(tree.pathOf('city-id').asJsonPointer()).toBe(
        '/properties/address/properties/city',
      );
    });

    it('returns path for array items', () => {
      const itemNode = createStringNode('item-id', 'item');
      const tagsNode = createArrayNode('tags-id', 'tags', itemNode);
      const root = createObjectNode('root-id', 'root', [tagsNode]);
      const tree = createSchemaTree(root);

      expect(tree.pathOf('item-id').asJsonPointer()).toBe(
        '/properties/tags/items',
      );
    });

    it('returns EMPTY_PATH for unknown id', () => {
      const root = createObjectNode('root-id', 'root');
      const tree = createSchemaTree(root);

      expect(tree.pathOf('unknown').isEmpty()).toBe(true);
    });
  });

  describe('nodeAt', () => {
    it('returns root for empty path', () => {
      const root = createObjectNode('root-id', 'root');
      const tree = createSchemaTree(root);

      expect(tree.nodeAt(EMPTY_PATH)).toBe(root);
    });

    it('returns node at path', () => {
      const nameNode = createStringNode('name-id', 'name');
      const root = createObjectNode('root-id', 'root', [nameNode]);
      const tree = createSchemaTree(root);

      const path = jsonPointerToPath('/properties/name');
      expect(tree.nodeAt(path)).toBe(nameNode);
    });

    it('returns nested node at path', () => {
      const cityNode = createStringNode('city-id', 'city');
      const addressNode = createObjectNode('address-id', 'address', [cityNode]);
      const root = createObjectNode('root-id', 'root', [addressNode]);
      const tree = createSchemaTree(root);

      const path = jsonPointerToPath('/properties/address/properties/city');
      expect(tree.nodeAt(path)).toBe(cityNode);
    });

    it('returns array items at path', () => {
      const itemNode = createStringNode('item-id', 'item');
      const tagsNode = createArrayNode('tags-id', 'tags', itemNode);
      const root = createObjectNode('root-id', 'root', [tagsNode]);
      const tree = createSchemaTree(root);

      const path = jsonPointerToPath('/properties/tags/items');
      expect(tree.nodeAt(path)).toBe(itemNode);
    });

    it('returns NULL_NODE for invalid path', () => {
      const root = createObjectNode('root-id', 'root');
      const tree = createSchemaTree(root);

      const path = jsonPointerToPath('/properties/missing');
      expect(tree.nodeAt(path)).toBe(NULL_NODE);
    });

    it('returns NULL_NODE for deeply invalid path', () => {
      const root = createObjectNode('root-id', 'root');
      const tree = createSchemaTree(root);

      const path = jsonPointerToPath('/properties/missing/properties/nested');
      expect(tree.nodeAt(path)).toBe(NULL_NODE);
    });
  });

  describe('nodeIds', () => {
    it('iterates over all node ids', () => {
      const nameNode = createStringNode('name-id', 'name');
      const ageNode = createNumberNode('age-id', 'age');
      const root = createObjectNode('root-id', 'root', [nameNode, ageNode]);
      const tree = createSchemaTree(root);

      const ids = [...tree.nodeIds()];
      expect(ids).toContain('root-id');
      expect(ids).toContain('name-id');
      expect(ids).toContain('age-id');
      expect(ids).toHaveLength(3);
    });

    it('includes nested node ids', () => {
      const cityNode = createStringNode('city-id', 'city');
      const addressNode = createObjectNode('address-id', 'address', [cityNode]);
      const root = createObjectNode('root-id', 'root', [addressNode]);
      const tree = createSchemaTree(root);

      const ids = [...tree.nodeIds()];
      expect(ids).toHaveLength(3);
      expect(ids).toContain('city-id');
    });
  });

  describe('countNodes', () => {
    it('returns total node count', () => {
      const nameNode = createStringNode('name-id', 'name');
      const ageNode = createNumberNode('age-id', 'age');
      const root = createObjectNode('root-id', 'root', [nameNode, ageNode]);
      const tree = createSchemaTree(root);

      expect(tree.countNodes()).toBe(3);
    });

    it('counts nested nodes', () => {
      const cityNode = createStringNode('city-id', 'city');
      const addressNode = createObjectNode('address-id', 'address', [cityNode]);
      const itemNode = createStringNode('item-id', 'item');
      const tagsNode = createArrayNode('tags-id', 'tags', itemNode);
      const root = createObjectNode('root-id', 'root', [addressNode, tagsNode]);
      const tree = createSchemaTree(root);

      expect(tree.countNodes()).toBe(5);
    });
  });

  describe('clone', () => {
    it('creates deep copy of tree', () => {
      const nameNode = createStringNode('name-id', 'name');
      const root = createObjectNode('root-id', 'root', [nameNode]);
      const tree = createSchemaTree(root);

      const cloned = tree.clone();

      expect(cloned).not.toBe(tree);
      expect(cloned.root()).not.toBe(root);
      expect(cloned.root().id()).toBe('root-id');
    });

    it('cloned tree has same structure', () => {
      const cityNode = createStringNode('city-id', 'city');
      const addressNode = createObjectNode('address-id', 'address', [cityNode]);
      const root = createObjectNode('root-id', 'root', [addressNode]);
      const tree = createSchemaTree(root);

      const cloned = tree.clone();

      expect(cloned.nodeById('city-id').id()).toBe('city-id');
      expect(cloned.pathOf('city-id').asJsonPointer()).toBe(
        '/properties/address/properties/city',
      );
    });

    it('cloned tree nodes are independent', () => {
      const nameNode = createStringNode('name-id', 'name');
      const root = createObjectNode('root-id', 'root', [nameNode]);
      const tree = createSchemaTree(root);

      const cloned = tree.clone();

      expect(cloned.nodeById('name-id')).not.toBe(nameNode);
    });
  });
});

describe('TreeNodeIndex', () => {
  it('indexes complex tree structure', () => {
    const innerItem = createObjectNode('inner-item-id', 'innerItem', [
      createStringNode('value-id', 'value'),
    ]);
    const itemNode = createArrayNode('item-id', 'item', innerItem);
    const listNode = createArrayNode('list-id', 'list', itemNode);
    const root = createObjectNode('root-id', 'root', [listNode]);
    const tree = createSchemaTree(root);

    expect(tree.countNodes()).toBe(5);
    expect(tree.pathOf('value-id').asJsonPointer()).toBe(
      '/properties/list/items/items/properties/value',
    );
  });
});
