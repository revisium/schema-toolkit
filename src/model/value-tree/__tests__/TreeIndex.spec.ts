import { describe, it, expect } from '@jest/globals';
import { obj, str, arr } from '../../../mocks/schema.mocks.js';
import type { JsonArraySchema, JsonSchema } from '../../../types/schema.types.js';
import { createNodeFactory } from '../../value-node/NodeFactory.js';
import { StringValueNode } from '../../value-node/StringValueNode.js';
import type { ValueNode } from '../../value-node/types.js';
import { TreeIndex } from '../TreeIndex.js';

function createTree(schema: JsonSchema, data: unknown): ValueNode {
  const factory = createNodeFactory();
  return factory.createTree(schema, data);
}

describe('TreeIndex', () => {
  describe('nodeById', () => {
    it('finds root node by id', () => {
      const root = createTree(obj({ name: str() }), { name: 'test' });
      const index = new TreeIndex(root);

      expect(index.nodeById(root.id)).toBe(root);
    });

    it('finds child node by id', () => {
      const root = createTree(obj({ name: str() }), { name: 'test' });
      const index = new TreeIndex(root);

      const nameNode = root.isObject() ? root.child('name') : undefined;
      expect(nameNode).toBeDefined();
      expect(index.nodeById(nameNode!.id)).toBe(nameNode);
    });

    it('finds deeply nested node by id', () => {
      const schema = obj({
        address: obj({
          city: str(),
        }),
      });
      const root = createTree(schema, { address: { city: 'NYC' } });
      const index = new TreeIndex(root);

      const addressNode = root.isObject() ? root.child('address') : undefined;
      const cityNode =
        addressNode?.isObject() ? addressNode.child('city') : undefined;
      expect(cityNode).toBeDefined();
      expect(index.nodeById(cityNode!.id)).toBe(cityNode);
    });

    it('finds array item by id', () => {
      const schema = obj({
        items: arr(obj({ name: str() })),
      });
      const root = createTree(schema, { items: [{ name: 'a' }, { name: 'b' }] });
      const index = new TreeIndex(root);

      const itemsNode = root.isObject() ? root.child('items') : undefined;
      const firstItem = itemsNode?.isArray() ? itemsNode.at(0) : undefined;
      expect(firstItem).toBeDefined();
      expect(index.nodeById(firstItem!.id)).toBe(firstItem);
    });

    it('returns undefined for unknown id', () => {
      const root = createTree(obj({ name: str() }), { name: 'test' });
      const index = new TreeIndex(root);

      expect(index.nodeById('non-existent')).toBeUndefined();
    });

    it('rebuilds index and finds newly added node', () => {
      const root = createTree(obj({ name: str() }), { name: 'test' });
      const index = new TreeIndex(root);

      const newChild = new StringValueNode(undefined, 'email', str(), 'test@example.com');
      if (root.isObject()) {
        root.addChild(newChild);
      }

      expect(index.nodeById(newChild.id)).toBe(newChild);
    });
  });

  describe('pathOf', () => {
    it('returns empty path for root node', () => {
      const root = createTree(obj({ name: str() }), { name: 'test' });
      const index = new TreeIndex(root);

      expect(index.pathOf(root).isEmpty()).toBe(true);
    });

    it('returns property path for object child', () => {
      const root = createTree(obj({ name: str() }), { name: 'test' });
      const index = new TreeIndex(root);

      const nameNode = root.isObject() ? root.child('name') : undefined;
      expect(nameNode).toBeDefined();
      expect(index.pathOf(nameNode!).asJsonPointer()).toBe('/name');
    });

    it('returns nested property path', () => {
      const schema = obj({
        address: obj({
          city: str(),
        }),
      });
      const root = createTree(schema, { address: { city: 'NYC' } });
      const index = new TreeIndex(root);

      const addressNode = root.isObject() ? root.child('address') : undefined;
      const cityNode = addressNode?.isObject() ? addressNode.child('city') : undefined;
      expect(cityNode).toBeDefined();
      expect(index.pathOf(cityNode!).asJsonPointer()).toBe('/address/city');
    });

    it('returns index path for array items', () => {
      const schema = obj({
        items: arr(str()),
      });
      const root = createTree(schema, { items: ['a', 'b', 'c'] });
      const index = new TreeIndex(root);

      const itemsNode = root.isObject() ? root.child('items') : undefined;
      const secondItem = itemsNode?.isArray() ? itemsNode.at(1) : undefined;
      expect(secondItem).toBeDefined();
      expect(index.pathOf(secondItem!).asJsonPointer()).toBe('/items/1');
    });

    it('returns nested path inside array item', () => {
      const schema = obj({
        items: arr(obj({ name: str() })),
      });
      const root = createTree(schema, { items: [{ name: 'first' }, { name: 'second' }] });
      const index = new TreeIndex(root);

      const itemsNode = root.isObject() ? root.child('items') : undefined;
      const secondItem = itemsNode?.isArray() ? itemsNode.at(1) : undefined;
      const nameNode = secondItem?.isObject() ? secondItem.child('name') : undefined;
      expect(nameNode).toBeDefined();
      expect(index.pathOf(nameNode!).asJsonPointer()).toBe('/items/1/name');
    });

    it('caches path for non-array nodes', () => {
      const root = createTree(obj({ name: str() }), { name: 'test' });
      const index = new TreeIndex(root);

      const nameNode = root.isObject() ? root.child('name') : undefined;
      expect(nameNode).toBeDefined();

      const path1 = index.pathOf(nameNode!);
      const path2 = index.pathOf(nameNode!);
      expect(path1).toBe(path2);
    });

    it('does not cache path for nodes inside arrays', () => {
      const schema = obj({
        items: arr(str()),
      });
      const root = createTree(schema, { items: ['a'] });
      const index = new TreeIndex(root);

      const itemsNode = root.isObject() ? root.child('items') : undefined;
      const firstItem = itemsNode?.isArray() ? itemsNode.at(0) : undefined;
      expect(firstItem).toBeDefined();

      const path1 = index.pathOf(firstItem!);
      const path2 = index.pathOf(firstItem!);
      expect(path1.asJsonPointer()).toBe(path2.asJsonPointer());
      expect(path1).not.toBe(path2);
    });
  });

  describe('registerNode', () => {
    it('registers a new node so nodeById finds it without rebuild', () => {
      const root = createTree(obj({ name: str() }), { name: 'test' });
      const index = new TreeIndex(root);

      const newChild = new StringValueNode(undefined, 'email', str(), 'value');
      if (root.isObject()) {
        root.addChild(newChild);
      }
      index.registerNode(newChild);

      expect(index.nodeById(newChild.id)).toBe(newChild);
    });

    it('registers node with nested children', () => {
      const schema = obj({ name: str() });
      const root = createTree(schema, { name: 'test' });
      const index = new TreeIndex(root);

      const factory = createNodeFactory();
      const nestedObj = factory.create(
        'nested',
        obj({ city: str() }),
        { city: 'NYC' },
      );
      if (root.isObject()) {
        root.addChild(nestedObj);
      }
      index.registerNode(nestedObj);

      expect(index.nodeById(nestedObj.id)).toBe(nestedObj);
      const cityNode = nestedObj.isObject() ? nestedObj.child('city') : undefined;
      expect(cityNode).toBeDefined();
      expect(index.nodeById(cityNode!.id)).toBe(cityNode);
    });
  });

  describe('invalidatePathsUnder', () => {
    it('invalidates cached path for node', () => {
      const schema = obj({
        data: obj({
          name: str(),
        }),
      });
      const root = createTree(schema, { data: { name: 'test' } });
      const index = new TreeIndex(root);

      const dataNode = root.isObject() ? root.child('data') : undefined;
      const nameNode = dataNode?.isObject() ? dataNode.child('name') : undefined;
      expect(nameNode).toBeDefined();

      const path1 = index.pathOf(nameNode!);
      expect(path1.asJsonPointer()).toBe('/data/name');

      index.invalidatePathsUnder(dataNode!);

      const path2 = index.pathOf(nameNode!);
      expect(path2.asJsonPointer()).toBe('/data/name');
      expect(path2).not.toBe(path1);
    });

    it('invalidates paths for all children of object', () => {
      const schema = obj({
        data: obj({
          name: str(),
          age: str(),
        }),
      });
      const root = createTree(schema, { data: { name: 'test', age: '25' } });
      const index = new TreeIndex(root);

      const dataNode = root.isObject() ? root.child('data') : undefined;
      const nameNode = dataNode?.isObject() ? dataNode.child('name') : undefined;
      const ageNode = dataNode?.isObject() ? dataNode.child('age') : undefined;
      expect(nameNode).toBeDefined();
      expect(ageNode).toBeDefined();

      const namePath1 = index.pathOf(nameNode!);
      const agePath1 = index.pathOf(ageNode!);

      index.invalidatePathsUnder(dataNode!);

      const namePath2 = index.pathOf(nameNode!);
      const agePath2 = index.pathOf(ageNode!);
      expect(namePath2).not.toBe(namePath1);
      expect(agePath2).not.toBe(agePath1);
    });

    it('invalidates paths for array children', () => {
      const schema = obj({
        wrapper: obj({
          items: arr(str()),
        }),
      });
      const root = createTree(schema, { wrapper: { items: ['a', 'b'] } });
      const index = new TreeIndex(root);

      const wrapperNode = root.isObject() ? root.child('wrapper') : undefined;
      const itemsNode = wrapperNode?.isObject() ? wrapperNode.child('items') : undefined;
      expect(itemsNode?.isArray()).toBe(true);

      index.pathOf(wrapperNode!);
      index.pathOf(itemsNode!);

      index.invalidatePathsUnder(wrapperNode!);

      const itemsPath = index.pathOf(itemsNode!);
      expect(itemsPath.asJsonPointer()).toBe('/wrapper/items');
    });
  });

  describe('rebuild', () => {
    it('clears and reindexes all nodes', () => {
      const root = createTree(obj({ name: str() }), { name: 'test' });
      const index = new TreeIndex(root);

      const nameNode = root.isObject() ? root.child('name') : undefined;
      expect(nameNode).toBeDefined();
      expect(index.nodeById(nameNode!.id)).toBe(nameNode);

      index.rebuild();

      expect(index.nodeById(nameNode!.id)).toBe(nameNode);
    });

    it('clears path cache on rebuild', () => {
      const root = createTree(obj({ name: str() }), { name: 'test' });
      const index = new TreeIndex(root);

      const nameNode = root.isObject() ? root.child('name') : undefined;
      expect(nameNode).toBeDefined();

      const path1 = index.pathOf(nameNode!);
      index.rebuild();
      const path2 = index.pathOf(nameNode!);

      expect(path1.asJsonPointer()).toBe(path2.asJsonPointer());
      expect(path1).not.toBe(path2);
    });
  });

  describe('path cache invalidation with array mutations', () => {
    const schema = obj({
      items: arr(obj({ name: str() })),
    });

    it('returns correct path after array insert at beginning', () => {
      const factory = createNodeFactory();
      const root = factory.createTree(schema, {
        items: [{ name: 'first' }, { name: 'second' }],
      });
      const index = new TreeIndex(root);

      const itemsNode = root.isObject() ? root.child('items') : undefined;
      expect(itemsNode?.isArray()).toBe(true);

      const originalSecond = itemsNode!.isArray() ? itemsNode!.at(1) : undefined;
      expect(originalSecond).toBeDefined();
      expect(originalSecond!.getPlainValue()).toEqual({ name: 'second' });

      if (itemsNode!.isArray()) {
        const newItem = factory.create(
          '0',
          (schema.properties!.items as JsonArraySchema).items,
          { name: 'new' },
        );
        itemsNode!.insertAt(0, newItem);
        index.registerNode(newItem);
      }

      expect(index.pathOf(originalSecond!).asJsonPointer()).toBe('/items/2');
    });

    it('returns correct path after array remove', () => {
      const root = createTree(schema, {
        items: [{ name: 'first' }, { name: 'second' }, { name: 'third' }],
      });
      const index = new TreeIndex(root);

      const itemsNode = root.isObject() ? root.child('items') : undefined;
      const originalThird = itemsNode?.isArray() ? itemsNode.at(2) : undefined;
      expect(originalThird).toBeDefined();

      if (itemsNode?.isArray()) {
        itemsNode.removeAt(0);
      }

      expect(index.pathOf(originalThird!).asJsonPointer()).toBe('/items/1');
    });

    it('returns correct path after array move', () => {
      const root = createTree(schema, {
        items: [{ name: 'first' }, { name: 'second' }, { name: 'third' }],
      });
      const index = new TreeIndex(root);

      const itemsNode = root.isObject() ? root.child('items') : undefined;
      const originalFirst = itemsNode?.isArray() ? itemsNode.at(0) : undefined;
      const originalThird = itemsNode?.isArray() ? itemsNode.at(2) : undefined;
      expect(originalFirst).toBeDefined();
      expect(originalThird).toBeDefined();

      if (itemsNode?.isArray()) {
        itemsNode.move(0, 2);
      }

      expect(index.pathOf(originalFirst!).asJsonPointer()).toBe('/items/2');
      expect(index.pathOf(originalThird!).asJsonPointer()).toBe('/items/1');
    });

    it('nested node paths update after parent array mutation', () => {
      const root = createTree(schema, {
        items: [{ name: 'first' }, { name: 'second' }],
      });
      const index = new TreeIndex(root);

      const itemsNode = root.isObject() ? root.child('items') : undefined;
      const secondItem = itemsNode?.isArray() ? itemsNode.at(1) : undefined;
      const nestedName = secondItem?.isObject()
        ? secondItem.child('name')
        : undefined;
      expect(nestedName).toBeDefined();
      expect(index.pathOf(nestedName!).asJsonPointer()).toBe('/items/1/name');

      if (itemsNode?.isArray()) {
        const factory = createNodeFactory();
        const newItem = factory.create(
          '0',
          (schema.properties!.items as JsonArraySchema).items,
          { name: 'new' },
        );
        itemsNode.insertAt(0, newItem);
        index.registerNode(newItem);
      }

      expect(index.pathOf(nestedName!).asJsonPointer()).toBe('/items/2/name');
    });
  });

  describe('object mutations', () => {
    it('nodeById finds node after object child add', () => {
      const root = createTree(obj({ name: str() }), { name: 'test' });
      const index = new TreeIndex(root);

      const newChild = new StringValueNode(undefined, 'newField', str(), 'value');
      if (root.isObject()) {
        root.addChild(newChild);
      }
      index.registerNode(newChild);

      expect(index.nodeById(newChild.id)).toBe(newChild);
      expect(index.pathOf(newChild).asJsonPointer()).toBe('/newField');
    });
  });
});
