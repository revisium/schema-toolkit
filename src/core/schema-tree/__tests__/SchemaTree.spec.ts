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

describe('SchemaTree mutations', () => {
  describe('trackReplacement', () => {
    it('tracks node replacements', () => {
      const root = createObjectNode('root-id', 'root', [
        createStringNode('old-id', 'field'),
      ]);
      const tree = createSchemaTree(root);

      tree.trackReplacement('old-id', 'new-id');

      const replacements = [...tree.replacements()];
      expect(replacements).toEqual([['old-id', 'new-id']]);
    });

    it('preserves replacements after clone', () => {
      const root = createObjectNode('root-id', 'root');
      const tree = createSchemaTree(root);
      tree.trackReplacement('a', 'b');

      const cloned = tree.clone();

      expect([...cloned.replacements()]).toEqual([['a', 'b']]);
    });
  });

  describe('addChildTo', () => {
    it('adds child to object node', () => {
      const root = createObjectNode('root-id', 'root');
      const tree = createSchemaTree(root);
      const newNode = createStringNode('new-id', 'newField');

      tree.addChildTo('root-id', newNode);

      expect(tree.nodeById('new-id')).toBe(newNode);
      expect(tree.pathOf('new-id').asJsonPointer()).toBe('/properties/newField');
    });

    it('does nothing when parent not found', () => {
      const root = createObjectNode('root-id', 'root');
      const tree = createSchemaTree(root);
      const newNode = createStringNode('new-id', 'newField');

      tree.addChildTo('unknown-id', newNode);

      expect(tree.nodeById('new-id')).toBe(NULL_NODE);
    });

    it('throws error when adding child to array node', () => {
      const itemNode = createStringNode('item-id', 'item');
      const arrayNode = createArrayNode('array-id', 'items', itemNode);
      const root = createObjectNode('root-id', 'root', [arrayNode]);
      const tree = createSchemaTree(root);
      const newNode = createStringNode('new-id', 'newField');

      expect(() => tree.addChildTo('array-id', newNode)).toThrow(
        'Cannot add child to array node. Use setItems instead.',
      );
    });
  });

  describe('insertChildAt', () => {
    it('inserts child at index in object node', () => {
      const nameNode = createStringNode('name-id', 'name');
      const ageNode = createNumberNode('age-id', 'age');
      const root = createObjectNode('root-id', 'root', [nameNode, ageNode]);
      const tree = createSchemaTree(root);
      const newNode = createStringNode('new-id', 'email');

      tree.insertChildAt('root-id', 0, newNode);

      expect(tree.nodeById('new-id')).toBe(newNode);
      expect(tree.pathOf('new-id').asJsonPointer()).toBe('/properties/email');
      expect(tree.root().properties()[0]).toBe(newNode);
      expect(tree.root().properties()[1]).toBe(nameNode);
      expect(tree.root().properties()[2]).toBe(ageNode);
    });

    it('inserts child at end', () => {
      const nameNode = createStringNode('name-id', 'name');
      const root = createObjectNode('root-id', 'root', [nameNode]);
      const tree = createSchemaTree(root);
      const newNode = createStringNode('new-id', 'email');

      tree.insertChildAt('root-id', 1, newNode);

      expect(tree.root().properties()[0]).toBe(nameNode);
      expect(tree.root().properties()[1]).toBe(newNode);
    });

    it('does nothing when parent not found', () => {
      const root = createObjectNode('root-id', 'root');
      const tree = createSchemaTree(root);
      const newNode = createStringNode('new-id', 'newField');

      tree.insertChildAt('unknown-id', 0, newNode);

      expect(tree.nodeById('new-id')).toBe(NULL_NODE);
    });

    it('throws error when inserting into array node', () => {
      const itemNode = createStringNode('item-id', 'item');
      const arrayNode = createArrayNode('array-id', 'items', itemNode);
      const root = createObjectNode('root-id', 'root', [arrayNode]);
      const tree = createSchemaTree(root);
      const newNode = createStringNode('new-id', 'newField');

      expect(() => tree.insertChildAt('array-id', 0, newNode)).toThrow(
        'Cannot add child to array node. Use setItems instead.',
      );
    });

    it('rebuilds index after insert', () => {
      const root = createObjectNode('root-id', 'root');
      const tree = createSchemaTree(root);
      const newNode = createStringNode('new-id', 'field');

      tree.insertChildAt('root-id', 0, newNode);

      expect(tree.countNodes()).toBe(2);
      expect(tree.nodeById('new-id')).toBe(newNode);
    });
  });

  describe('removeNodeAt', () => {
    it('removes node at path', () => {
      const nameNode = createStringNode('name-id', 'name');
      const root = createObjectNode('root-id', 'root', [nameNode]);
      const tree = createSchemaTree(root);

      const result = tree.removeNodeAt(jsonPointerToPath('/properties/name'));

      expect(result).toBe(true);
      expect(tree.nodeById('name-id')).toBe(NULL_NODE);
    });

    it('returns false for empty path', () => {
      const root = createObjectNode('root-id', 'root');
      const tree = createSchemaTree(root);

      const result = tree.removeNodeAt(EMPTY_PATH);

      expect(result).toBe(false);
    });

    it('returns false when parent not found', () => {
      const root = createObjectNode('root-id', 'root');
      const tree = createSchemaTree(root);

      const result = tree.removeNodeAt(jsonPointerToPath('/properties/missing/properties/nested'));

      expect(result).toBe(false);
    });

    it('returns false for items path', () => {
      const itemNode = createStringNode('item-id', 'item');
      const arrayNode = createArrayNode('array-id', 'items', itemNode);
      const root = createObjectNode('root-id', 'root', [arrayNode]);
      const tree = createSchemaTree(root);

      const result = tree.removeNodeAt(jsonPointerToPath('/properties/items/items'));

      expect(result).toBe(false);
    });

    it('returns false when node does not exist', () => {
      const root = createObjectNode('root-id', 'root');
      const tree = createSchemaTree(root);

      const result = tree.removeNodeAt(jsonPointerToPath('/properties/missing'));

      expect(result).toBe(false);
    });
  });

  describe('renameNode', () => {
    it('renames node', () => {
      const nameNode = createStringNode('name-id', 'name');
      const root = createObjectNode('root-id', 'root', [nameNode]);
      const tree = createSchemaTree(root);

      tree.renameNode('name-id', 'newName');

      expect(tree.pathOf('name-id').asJsonPointer()).toBe('/properties/newName');
    });

    it('does nothing when node not found', () => {
      const root = createObjectNode('root-id', 'root');
      const tree = createSchemaTree(root);

      tree.renameNode('unknown-id', 'newName');

      expect(tree.countNodes()).toBe(1);
    });
  });

  describe('moveNode', () => {
    it('moves node to new parent', () => {
      const nameNode = createStringNode('name-id', 'name');
      const targetNode = createObjectNode('target-id', 'target');
      const root = createObjectNode('root-id', 'root', [nameNode, targetNode]);
      const tree = createSchemaTree(root);

      tree.moveNode('name-id', 'target-id');

      expect(tree.pathOf('name-id').asJsonPointer()).toBe('/properties/target/properties/name');
    });

    it('does nothing when node not found', () => {
      const targetNode = createObjectNode('target-id', 'target');
      const root = createObjectNode('root-id', 'root', [targetNode]);
      const tree = createSchemaTree(root);

      tree.moveNode('unknown-id', 'target-id');

      expect(tree.countNodes()).toBe(2);
    });

    it('does nothing when trying to move root', () => {
      const targetNode = createObjectNode('target-id', 'target');
      const root = createObjectNode('root-id', 'root', [targetNode]);
      const tree = createSchemaTree(root);

      tree.moveNode('root-id', 'target-id');

      expect(tree.pathOf('root-id').isEmpty()).toBe(true);
    });

    it('does nothing when new parent not found', () => {
      const nameNode = createStringNode('name-id', 'name');
      const root = createObjectNode('root-id', 'root', [nameNode]);
      const tree = createSchemaTree(root);

      tree.moveNode('name-id', 'unknown-id');

      expect(tree.pathOf('name-id').asJsonPointer()).toBe('/properties/name');
    });

    it('throws error when moving from array parent', () => {
      const itemNode = createStringNode('item-id', 'item');
      const arrayNode = createArrayNode('array-id', 'items', itemNode);
      const targetNode = createObjectNode('target-id', 'target');
      const root = createObjectNode('root-id', 'root', [arrayNode, targetNode]);
      const tree = createSchemaTree(root);

      expect(() => tree.moveNode('item-id', 'target-id')).toThrow(
        'Cannot move node from array. Array items cannot be moved.',
      );
    });

    it('throws error when moving into array parent', () => {
      const nameNode = createStringNode('name-id', 'name');
      const itemNode = createStringNode('item-id', 'item');
      const arrayNode = createArrayNode('array-id', 'items', itemNode);
      const root = createObjectNode('root-id', 'root', [nameNode, arrayNode]);
      const tree = createSchemaTree(root);

      expect(() => tree.moveNode('name-id', 'array-id')).toThrow(
        'Cannot move node into array. Use setItems instead.',
      );
    });

    it('prevents moving node under itself', () => {
      const innerNode = createObjectNode('inner-id', 'inner');
      const outerNode = createObjectNode('outer-id', 'outer', [innerNode]);
      const root = createObjectNode('root-id', 'root', [outerNode]);
      const tree = createSchemaTree(root);

      tree.moveNode('outer-id', 'inner-id');

      expect(tree.pathOf('outer-id').asJsonPointer()).toBe('/properties/outer');
    });

    it('prevents moving node under its descendant', () => {
      const deepNode = createObjectNode('deep-id', 'deep');
      const innerNode = createObjectNode('inner-id', 'inner', [deepNode]);
      const outerNode = createObjectNode('outer-id', 'outer', [innerNode]);
      const root = createObjectNode('root-id', 'root', [outerNode]);
      const tree = createSchemaTree(root);

      tree.moveNode('outer-id', 'deep-id');

      expect(tree.pathOf('outer-id').asJsonPointer()).toBe('/properties/outer');
    });
  });

  describe('setNodeAt', () => {
    it('replaces node at path', () => {
      const oldNode = createStringNode('old-id', 'field');
      const root = createObjectNode('root-id', 'root', [oldNode]);
      const tree = createSchemaTree(root);
      const newNode = createNumberNode('new-id', 'field');

      tree.setNodeAt(jsonPointerToPath('/properties/field'), newNode);

      expect(tree.nodeById('new-id')).toBe(newNode);
      expect(tree.nodeById('old-id')).toBe(NULL_NODE);
    });

    it('sets array items', () => {
      const oldItem = createStringNode('old-item-id', 'item');
      const arrayNode = createArrayNode('array-id', 'items', oldItem);
      const root = createObjectNode('root-id', 'root', [arrayNode]);
      const tree = createSchemaTree(root);
      const newItem = createNumberNode('new-item-id', 'item');

      tree.setNodeAt(jsonPointerToPath('/properties/items/items'), newItem);

      expect(tree.nodeById('new-item-id')).toBe(newItem);
    });

    it('does nothing for empty path', () => {
      const root = createObjectNode('root-id', 'root');
      const tree = createSchemaTree(root);
      const newNode = createStringNode('new-id', 'root');

      tree.setNodeAt(EMPTY_PATH, newNode);

      expect(tree.root().id()).toBe('root-id');
    });

    it('does nothing when parent not found', () => {
      const root = createObjectNode('root-id', 'root');
      const tree = createSchemaTree(root);
      const newNode = createStringNode('new-id', 'field');

      tree.setNodeAt(jsonPointerToPath('/properties/missing/properties/field'), newNode);

      expect(tree.nodeById('new-id')).toBe(NULL_NODE);
    });
  });
});
