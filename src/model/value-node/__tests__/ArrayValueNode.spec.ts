import type { JsonArraySchema, JsonSchema } from '../../../types/schema.types.js';
import {
  ArrayValueNode,
  StringValueNode,
  createNodeFactory,
  resetNodeIdCounter,
} from '../index.js';
import { str, arr } from '../../../mocks/schema.mocks.js';

beforeEach(() => {
  resetNodeIdCounter();
});

const createSchema = (items: JsonSchema = str()): JsonArraySchema => arr(items);

describe('ArrayValueNode', () => {
  describe('construction', () => {
    it('creates empty array node', () => {
      const node = new ArrayValueNode(undefined, 'items', createSchema());

      expect(node.type).toBe('array');
      expect(node.name).toBe('items');
      expect(node.length).toBe(0);
    });

    it('creates array node with items', () => {
      const item1 = new StringValueNode(
        undefined,
        '0',
        str(),
        'a',
      );
      const item2 = new StringValueNode(
        undefined,
        '1',
        str(),
        'b',
      );

      const node = new ArrayValueNode(undefined, 'items', createSchema(), [
        item1,
        item2,
      ]);

      expect(node.length).toBe(2);
      expect(node.at(0)).toBe(item1);
      expect(node.at(1)).toBe(item2);
    });

    it('sets parent on items', () => {
      const item = new StringValueNode(
        undefined,
        '0',
        str(),
        'a',
      );

      const node = new ArrayValueNode(undefined, 'items', createSchema(), [
        item,
      ]);

      expect(item.parent).toBe(node);
    });

    it('uses provided id', () => {
      const node = new ArrayValueNode('custom-id', 'items', createSchema());

      expect(node.id).toBe('custom-id');
    });

    it('generates id when not provided', () => {
      const node = new ArrayValueNode(undefined, 'items', createSchema());

      expect(node.id).toBe('node-1');
    });
  });

  describe('value', () => {
    it('returns array of items', () => {
      const item1 = new StringValueNode(
        undefined,
        '0',
        str(),
        'a',
      );

      const node = new ArrayValueNode(undefined, 'items', createSchema(), [
        item1,
      ]);

      expect(node.value).toEqual([item1]);
    });
  });

  describe('getPlainValue', () => {
    it('returns plain array', () => {
      const item1 = new StringValueNode(
        undefined,
        '0',
        str(),
        'a',
      );
      const item2 = new StringValueNode(
        undefined,
        '1',
        str(),
        'b',
      );

      const node = new ArrayValueNode(undefined, 'items', createSchema(), [
        item1,
        item2,
      ]);

      expect(node.getPlainValue()).toEqual(['a', 'b']);
    });
  });

  describe('at', () => {
    it('returns item at positive index', () => {
      const item = new StringValueNode(
        undefined,
        '0',
        str(),
        'a',
      );

      const node = new ArrayValueNode(undefined, 'items', createSchema(), [
        item,
      ]);

      expect(node.at(0)).toBe(item);
    });

    it('returns item at negative index', () => {
      const item1 = new StringValueNode(
        undefined,
        '0',
        str(),
        'a',
      );
      const item2 = new StringValueNode(
        undefined,
        '1',
        str(),
        'b',
      );

      const node = new ArrayValueNode(undefined, 'items', createSchema(), [
        item1,
        item2,
      ]);

      expect(node.at(-1)).toBe(item2);
    });

    it('returns undefined for out of bounds index', () => {
      const node = new ArrayValueNode(undefined, 'items', createSchema());

      expect(node.at(5)).toBeUndefined();
    });
  });

  describe('push', () => {
    it('adds item to end', () => {
      const node = new ArrayValueNode(undefined, 'items', createSchema());
      const item = new StringValueNode(
        undefined,
        '0',
        str(),
        'a',
      );

      node.push(item);

      expect(node.length).toBe(1);
      expect(node.at(0)).toBe(item);
      expect(item.parent).toBe(node);
    });
  });

  describe('insertAt', () => {
    it('inserts item at beginning', () => {
      const existing = new StringValueNode(
        undefined,
        '0',
        str(),
        'b',
      );
      const node = new ArrayValueNode(undefined, 'items', createSchema(), [
        existing,
      ]);

      const newItem = new StringValueNode(
        undefined,
        '0',
        str(),
        'a',
      );
      node.insertAt(0, newItem);

      expect(node.length).toBe(2);
      expect(node.at(0)).toBe(newItem);
      expect(node.at(1)).toBe(existing);
      expect(newItem.parent).toBe(node);
    });

    it('inserts item at middle', () => {
      const item1 = new StringValueNode(
        undefined,
        '0',
        str(),
        'a',
      );
      const item3 = new StringValueNode(
        undefined,
        '1',
        str(),
        'c',
      );
      const node = new ArrayValueNode(undefined, 'items', createSchema(), [
        item1,
        item3,
      ]);

      const item2 = new StringValueNode(
        undefined,
        '1',
        str(),
        'b',
      );
      node.insertAt(1, item2);

      expect(node.getPlainValue()).toEqual(['a', 'b', 'c']);
    });

    it('throws for negative index', () => {
      const node = new ArrayValueNode(undefined, 'items', createSchema());

      const item = new StringValueNode(
        undefined,
        '0',
        str(),
        'a',
      );

      expect(() => node.insertAt(-1, item)).toThrow('Index out of bounds: -1');
    });

    it('throws for index beyond length', () => {
      const node = new ArrayValueNode(undefined, 'items', createSchema());

      const item = new StringValueNode(
        undefined,
        '0',
        str(),
        'a',
      );

      expect(() => node.insertAt(5, item)).toThrow('Index out of bounds: 5');
    });
  });

  describe('removeAt', () => {
    it('removes item at index', () => {
      const item = new StringValueNode(
        undefined,
        '0',
        str(),
        'a',
      );
      const node = new ArrayValueNode(undefined, 'items', createSchema(), [
        item,
      ]);

      node.removeAt(0);

      expect(node.length).toBe(0);
      expect(item.parent).toBeNull();
    });

    it('throws for negative index', () => {
      const node = new ArrayValueNode(undefined, 'items', createSchema());

      expect(() => node.removeAt(-1)).toThrow('Index out of bounds: -1');
    });

    it('throws for index out of bounds', () => {
      const node = new ArrayValueNode(undefined, 'items', createSchema());

      expect(() => node.removeAt(0)).toThrow('Index out of bounds: 0');
    });
  });

  describe('move', () => {
    it('moves item forward', () => {
      const item1 = new StringValueNode(
        undefined,
        '0',
        str(),
        'a',
      );
      const item2 = new StringValueNode(
        undefined,
        '1',
        str(),
        'b',
      );
      const item3 = new StringValueNode(
        undefined,
        '2',
        str(),
        'c',
      );
      const node = new ArrayValueNode(undefined, 'items', createSchema(), [
        item1,
        item2,
        item3,
      ]);

      node.move(0, 2);

      expect(node.getPlainValue()).toEqual(['b', 'c', 'a']);
    });

    it('moves item backward', () => {
      const item1 = new StringValueNode(
        undefined,
        '0',
        str(),
        'a',
      );
      const item2 = new StringValueNode(
        undefined,
        '1',
        str(),
        'b',
      );
      const item3 = new StringValueNode(
        undefined,
        '2',
        str(),
        'c',
      );
      const node = new ArrayValueNode(undefined, 'items', createSchema(), [
        item1,
        item2,
        item3,
      ]);

      node.move(2, 0);

      expect(node.getPlainValue()).toEqual(['c', 'a', 'b']);
    });

    it('does nothing when moving to same index', () => {
      const item = new StringValueNode(
        undefined,
        '0',
        str(),
        'a',
      );
      const node = new ArrayValueNode(undefined, 'items', createSchema(), [
        item,
      ]);

      node.move(0, 0);

      expect(node.at(0)).toBe(item);
    });

    it('throws for invalid source index', () => {
      const node = new ArrayValueNode(undefined, 'items', createSchema());

      expect(() => node.move(-1, 0)).toThrow('Source index out of bounds: -1');
    });

    it('throws for invalid target index', () => {
      const item = new StringValueNode(
        undefined,
        '0',
        str(),
        'a',
      );
      const node = new ArrayValueNode(undefined, 'items', createSchema(), [
        item,
      ]);

      expect(() => node.move(0, 5)).toThrow('Target index out of bounds: 5');
    });
  });

  describe('replaceAt', () => {
    it('replaces item at index', () => {
      const oldItem = new StringValueNode(
        undefined,
        '0',
        str(),
        'a',
      );
      const node = new ArrayValueNode(undefined, 'items', createSchema(), [
        oldItem,
      ]);

      const newItem = new StringValueNode(
        undefined,
        '0',
        str(),
        'b',
      );
      node.replaceAt(0, newItem);

      expect(node.at(0)).toBe(newItem);
      expect(oldItem.parent).toBeNull();
      expect(newItem.parent).toBe(node);
    });

    it('throws for invalid index', () => {
      const node = new ArrayValueNode(undefined, 'items', createSchema());

      const item = new StringValueNode(
        undefined,
        '0',
        str(),
        'a',
      );

      expect(() => node.replaceAt(0, item)).toThrow('Index out of bounds: 0');
    });
  });

  describe('clear', () => {
    it('removes all items', () => {
      const item1 = new StringValueNode(
        undefined,
        '0',
        str(),
        'a',
      );
      const item2 = new StringValueNode(
        undefined,
        '1',
        str(),
        'b',
      );
      const node = new ArrayValueNode(undefined, 'items', createSchema(), [
        item1,
        item2,
      ]);

      node.clear();

      expect(node.length).toBe(0);
      expect(item1.parent).toBeNull();
      expect(item2.parent).toBeNull();
    });
  });

  describe('pushValue and insertValueAt', () => {
    it('pushValue creates and adds node', () => {
      const factory = createNodeFactory();
      const schema = createSchema();
      const node = factory.createTree(schema, []) as ArrayValueNode;

      node.pushValue('a');

      expect(node.length).toBe(1);
      expect(node.getPlainValue()).toEqual(['a']);
    });

    it('pushValue uses default value', () => {
      const factory = createNodeFactory();
      const schema = createSchema(str({ default: 'default' }));
      const node = factory.createTree(schema, []) as ArrayValueNode;

      node.pushValue();

      expect(node.getPlainValue()).toEqual(['default']);
    });

    it('insertValueAt creates and inserts node', () => {
      const factory = createNodeFactory();
      const schema = createSchema();
      const node = factory.createTree(schema, ['a', 'c']) as ArrayValueNode;

      node.insertValueAt(1, 'b');

      expect(node.getPlainValue()).toEqual(['a', 'b', 'c']);
    });

    it('throws when no factory set', () => {
      const node = new ArrayValueNode(undefined, 'items', createSchema());

      expect(() => node.pushValue('a')).toThrow('NodeFactory not set');
    });
  });

  describe('dirty tracking', () => {
    it('isDirty is false initially', () => {
      const item = new StringValueNode(
        undefined,
        '0',
        str(),
        'a',
      );
      const node = new ArrayValueNode(undefined, 'items', createSchema(), [
        item,
      ]);

      expect(node.isDirty).toBe(false);
    });

    it('isDirty is true when item value changes', () => {
      const item = new StringValueNode(
        undefined,
        '0',
        str(),
        'a',
      );
      const node = new ArrayValueNode(undefined, 'items', createSchema(), [
        item,
      ]);

      item.setValue('b');

      expect(node.isDirty).toBe(true);
    });

    it('isDirty is true when item added', () => {
      const node = new ArrayValueNode(undefined, 'items', createSchema());
      node.commit();

      const item = new StringValueNode(
        undefined,
        '0',
        str(),
        'a',
      );
      node.push(item);

      expect(node.isDirty).toBe(true);
    });

    it('isDirty is true when item removed', () => {
      const item = new StringValueNode(
        undefined,
        '0',
        str(),
        'a',
      );
      const node = new ArrayValueNode(undefined, 'items', createSchema(), [
        item,
      ]);
      node.commit();

      node.removeAt(0);

      expect(node.isDirty).toBe(true);
    });

    it('commit updates baseItems', () => {
      const item = new StringValueNode(
        undefined,
        '0',
        str(),
        'a',
      );
      const node = new ArrayValueNode(undefined, 'items', createSchema(), [
        item,
      ]);

      item.setValue('b');
      node.commit();

      expect(node.isDirty).toBe(false);
      expect(item.isDirty).toBe(false);
    });

    it('revert restores items', () => {
      const item = new StringValueNode(
        undefined,
        '0',
        str(),
        'a',
      );
      const node = new ArrayValueNode(undefined, 'items', createSchema(), [
        item,
      ]);
      node.commit();

      item.setValue('b');
      node.revert();

      expect(item.value).toBe('a');
      expect(node.isDirty).toBe(false);
    });

    it('revert restores removed items', () => {
      const item = new StringValueNode(
        undefined,
        '0',
        str(),
        'a',
      );
      const node = new ArrayValueNode(undefined, 'items', createSchema(), [
        item,
      ]);
      node.commit();

      node.removeAt(0);
      node.revert();

      expect(node.length).toBe(1);
      expect(node.at(0)).toBe(item);
      expect(item.parent).toBe(node);
    });
  });

  describe('errors and warnings', () => {
    it('collects errors from items', () => {
      const item = new StringValueNode(
        undefined,
        '0',
        str({ required: true }),
        '',
      );
      const node = new ArrayValueNode(undefined, 'items', createSchema(), [
        item,
      ]);

      expect(node.errors).toHaveLength(1);
      expect(node.errors[0]?.type).toBe('required');
    });

    it('collects warnings from items', () => {
      const item = new StringValueNode(
        undefined,
        '0',
        str(),
        'a',
      );
      item.setFormulaWarning({
        type: 'type-coercion',
        message: 'test',
        expression: 'test',
        computedValue: 42,
      });
      const node = new ArrayValueNode(undefined, 'items', createSchema(), [
        item,
      ]);

      expect(node.warnings).toHaveLength(1);
    });

    it('isValid is false when item has errors', () => {
      const item = new StringValueNode(
        undefined,
        '0',
        str({ required: true }),
        '',
      );
      const node = new ArrayValueNode(undefined, 'items', createSchema(), [
        item,
      ]);

      expect(node.isValid).toBe(false);
    });
  });

  describe('type checks', () => {
    it('isArray returns true', () => {
      const node = new ArrayValueNode(undefined, 'items', createSchema());

      expect(node.isArray()).toBe(true);
    });

    it('isPrimitive returns false', () => {
      const node = new ArrayValueNode(undefined, 'items', createSchema());

      expect(node.isPrimitive()).toBe(false);
    });

    it('isObject returns false', () => {
      const node = new ArrayValueNode(undefined, 'items', createSchema());

      expect(node.isObject()).toBe(false);
    });
  });
});
