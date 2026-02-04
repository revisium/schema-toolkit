import { obj, str, num, arr } from '../../../mocks/schema.mocks.js';
import { StringValueNode, resetNodeIdCounter } from '../index.js';
import { NumberValueNode } from '../NumberValueNode.js';
import { ObjectValueNode } from '../ObjectValueNode.js';
import { ArrayValueNode } from '../ArrayValueNode.js';
import { createNodeFactory } from '../NodeFactory.js';

beforeEach(() => {
  resetNodeIdCounter();
});

describe('Value nodes with reactivity', () => {
  describe('StringValueNode', () => {
    it('initializes and works correctly', () => {
      const node = new StringValueNode(undefined, 'name', str(), 'value');

      expect(node.value).toBe('value');
    });
  });

  describe('NumberValueNode', () => {
    it('initializes and works correctly', () => {
      const node = new NumberValueNode(undefined, 'count', num(), 42);

      expect(node.value).toBe(42);
    });
  });

  describe('ObjectValueNode', () => {
    it('manages children correctly', () => {
      const child = new StringValueNode(undefined, 'name', str(), 'test');

      const node = new ObjectValueNode(undefined, 'root', obj({}), [child]);

      expect(node.children).toHaveLength(1);
      expect(node.child('name')).toBe(child);
    });

    it('revert restores children', () => {
      const child = new StringValueNode(undefined, 'name', str(), 'test');
      const node = new ObjectValueNode(undefined, 'root', obj({}), [child]);
      node.commit();

      node.removeChild('name');
      node.revert();

      expect(node.child('name')).toBe(child);
    });
  });

  describe('ArrayValueNode', () => {
    it('manages items correctly', () => {
      const item = new StringValueNode(undefined, '0', str(), 'a');

      const schema = arr(str());
      const node = new ArrayValueNode(undefined, 'items', schema, [item]);

      expect(node.length).toBe(1);
      expect(node.at(0)).toBe(item);
    });

    it('revert restores items', () => {
      const item = new StringValueNode(undefined, '0', str(), 'a');
      const schema = arr(str());
      const node = new ArrayValueNode(undefined, 'items', schema, [item]);
      node.commit();

      node.removeAt(0);
      node.revert();

      expect(node.length).toBe(1);
      expect(node.at(0)).toBe(item);
    });
  });

  describe('NodeFactory', () => {
    it('creates nodes correctly', () => {
      const factory = createNodeFactory();

      const schema = obj({
        name: str(),
        tags: arr(str()),
      });

      const node = factory.create('root', schema, { name: 'test', tags: ['a', 'b'] });

      expect(node.isObject()).toBe(true);
      if (node.isObject()) {
        const tags = node.child('tags');
        expect(tags?.isArray()).toBe(true);
        if (tags?.isArray()) {
          tags.pushValue('c');
          expect(tags.length).toBe(3);
        }
      }
    });

    it('propagates factory to nested arrays', () => {
      const factory = createNodeFactory();

      const schema = arr(
        obj({
          values: arr(num()),
        }),
      );

      const node = factory.create('root', schema, [{ values: [1, 2] }]);

      expect(node.isArray()).toBe(true);
      if (node.isArray()) {
        const item = node.at(0);
        expect(item?.isObject()).toBe(true);
        if (item?.isObject()) {
          const values = item.child('values');
          expect(values?.isArray()).toBe(true);
        }
      }
    });
  });
});
