import { describe, it, expect, jest } from '@jest/globals';
import type { ReactivityAdapter } from '../../../core/reactivity/types.js';
import { JsonSchemaTypeName, type JsonObjectSchema } from '../../../types/schema.types.js';
import { createNodeFactory } from '../../value-node/NodeFactory.js';
import { ValueTree } from '../ValueTree.js';

const createSimpleSchema = (): JsonObjectSchema => ({
  type: JsonSchemaTypeName.Object,
  additionalProperties: false,
  required: ['name', 'age'],
  properties: {
    name: { type: JsonSchemaTypeName.String, default: '' },
    age: { type: JsonSchemaTypeName.Number, default: 0 },
  },
});

const createNestedSchema = (): JsonObjectSchema => ({
  type: JsonSchemaTypeName.Object,
  additionalProperties: false,
  required: ['name', 'address'],
  properties: {
    name: { type: JsonSchemaTypeName.String, default: '' },
    address: {
      type: JsonSchemaTypeName.Object,
      additionalProperties: false,
      required: ['city'],
      properties: {
        city: { type: JsonSchemaTypeName.String, default: '' },
      },
    },
  },
});

const createArraySchema = (): JsonObjectSchema => ({
  type: JsonSchemaTypeName.Object,
  additionalProperties: false,
  required: ['items'],
  properties: {
    items: {
      type: JsonSchemaTypeName.Array,
      items: {
        type: JsonSchemaTypeName.Object,
        additionalProperties: false,
        required: ['name'],
        properties: {
          name: { type: JsonSchemaTypeName.String, default: '' },
        },
      },
    },
  },
});

function createTree(schema: unknown, data: unknown): ValueTree {
  const factory = createNodeFactory();
  const root = factory.createTree(schema as Parameters<typeof factory.createTree>[0], data);
  return new ValueTree(root);
}

describe('ValueTree', () => {
  describe('construction', () => {
    it('creates tree with root node', () => {
      const tree = createTree(createSimpleSchema(), { name: 'John', age: 30 });

      expect(tree.root).toBeDefined();
      expect(tree.root.isObject()).toBe(true);
    });
  });

  describe('get', () => {
    it('returns root for empty path', () => {
      const tree = createTree(createSimpleSchema(), { name: 'John', age: 30 });

      expect(tree.get('')).toBe(tree.root);
    });

    it('returns child by property path', () => {
      const tree = createTree(createSimpleSchema(), { name: 'John', age: 30 });

      const node = tree.get('name');

      expect(node).toBeDefined();
      expect(node?.getPlainValue()).toBe('John');
    });

    it('returns nested node', () => {
      const tree = createTree(createNestedSchema(), {
        name: 'John',
        address: { city: 'NYC' },
      });

      const node = tree.get('address.city');

      expect(node).toBeDefined();
      expect(node?.getPlainValue()).toBe('NYC');
    });

    it('returns array item by index', () => {
      const tree = createTree(createArraySchema(), {
        items: [{ name: 'Item 1' }, { name: 'Item 2' }],
      });

      const node = tree.get('items[0]');

      expect(node).toBeDefined();
      expect(node?.isObject()).toBe(true);
    });

    it('returns array item property', () => {
      const tree = createTree(createArraySchema(), {
        items: [{ name: 'Item 1' }, { name: 'Item 2' }],
      });

      const node = tree.get('items[0].name');

      expect(node?.getPlainValue()).toBe('Item 1');
    });

    it('returns undefined for non-existent path', () => {
      const tree = createTree(createSimpleSchema(), { name: 'John', age: 30 });

      expect(tree.get('missing')).toBeUndefined();
    });

    it('returns undefined for invalid nested path', () => {
      const tree = createTree(createSimpleSchema(), { name: 'John', age: 30 });

      expect(tree.get('name.invalid')).toBeUndefined();
    });

    it('returns undefined for out of bounds index', () => {
      const tree = createTree(createArraySchema(), {
        items: [{ name: 'Item 1' }],
      });

      expect(tree.get('items[10]')).toBeUndefined();
    });

    it('returns undefined for index on non-array', () => {
      const tree = createTree(createSimpleSchema(), { name: 'John', age: 30 });

      expect(tree.get('name[0]')).toBeUndefined();
    });

    it('returns undefined for property on non-object', () => {
      const tree = createTree(createArraySchema(), {
        items: [{ name: 'Item 1' }],
      });

      expect(tree.get('items.invalid')).toBeUndefined();
    });
  });

  describe('getValue', () => {
    it('returns value at path', () => {
      const tree = createTree(createSimpleSchema(), { name: 'John', age: 30 });

      expect(tree.getValue('name')).toBe('John');
      expect(tree.getValue('age')).toBe(30);
    });

    it('returns undefined for non-existent path', () => {
      const tree = createTree(createSimpleSchema(), { name: 'John', age: 30 });

      expect(tree.getValue('missing')).toBeUndefined();
    });
  });

  describe('setValue', () => {
    it('sets value at path', () => {
      const tree = createTree(createSimpleSchema(), { name: 'John', age: 30 });

      tree.setValue('name', 'Jane');

      expect(tree.getValue('name')).toBe('Jane');
    });

    it('throws for non-existent path', () => {
      const tree = createTree(createSimpleSchema(), { name: 'John', age: 30 });

      expect(() => tree.setValue('missing', 'value')).toThrow('Path not found: missing');
    });

    it('throws for non-primitive node', () => {
      const tree = createTree(createNestedSchema(), {
        name: 'John',
        address: { city: 'NYC' },
      });

      expect(() => tree.setValue('address', {})).toThrow(
        'Cannot set value on non-primitive node: address',
      );
    });
  });

  describe('getPlainValue', () => {
    it('returns full tree as plain object', () => {
      const tree = createTree(createSimpleSchema(), { name: 'John', age: 30 });

      expect(tree.getPlainValue()).toEqual({ name: 'John', age: 30 });
    });

    it('returns nested structure', () => {
      const tree = createTree(createNestedSchema(), {
        name: 'John',
        address: { city: 'NYC' },
      });

      expect(tree.getPlainValue()).toEqual({
        name: 'John',
        address: { city: 'NYC' },
      });
    });
  });

  describe('dirty tracking', () => {
    it('isDirty is false initially', () => {
      const tree = createTree(createSimpleSchema(), { name: 'John', age: 30 });

      expect(tree.isDirty).toBe(false);
    });

    it('isDirty is true after setValue', () => {
      const tree = createTree(createSimpleSchema(), { name: 'John', age: 30 });

      tree.setValue('name', 'Jane');

      expect(tree.isDirty).toBe(true);
    });

    it('commit resets isDirty', () => {
      const tree = createTree(createSimpleSchema(), { name: 'John', age: 30 });
      tree.setValue('name', 'Jane');

      tree.commit();

      expect(tree.isDirty).toBe(false);
    });

    it('commit preserves new values', () => {
      const tree = createTree(createSimpleSchema(), { name: 'John', age: 30 });
      tree.setValue('name', 'Jane');

      tree.commit();

      expect(tree.getValue('name')).toBe('Jane');
    });

    it('revert restores original values', () => {
      const tree = createTree(createSimpleSchema(), { name: 'John', age: 30 });
      tree.setValue('name', 'Jane');

      tree.revert();

      expect(tree.getValue('name')).toBe('John');
      expect(tree.isDirty).toBe(false);
    });
  });

  describe('validation', () => {
    it('isValid is true when no errors', () => {
      const tree = createTree(createSimpleSchema(), { name: 'John', age: 30 });

      expect(tree.isValid).toBe(true);
    });

    it('errors returns empty array by default', () => {
      const tree = createTree(createSimpleSchema(), { name: 'John', age: 30 });

      expect(tree.errors).toEqual([]);
    });
  });

  describe('getPatches', () => {
    it('returns empty array (patches not implemented)', () => {
      const tree = createTree(createSimpleSchema(), { name: 'John', age: 30 });
      tree.setValue('name', 'Jane');

      expect(tree.getPatches()).toEqual([]);
    });
  });

  describe('reactivity', () => {
    it('calls makeObservable when adapter provided', () => {
      const makeObservableMock = jest.fn();
      const mockAdapter: ReactivityAdapter = {
        makeObservable: makeObservableMock,
        observableArray: <T>() => [] as T[],
        observableMap: <K, V>() => new Map<K, V>(),
        reaction: () => () => {},
        runInAction: <T>(fn: () => T) => fn(),
      };

      const factory = createNodeFactory({ reactivity: mockAdapter });
      const root = factory.createTree(createSimpleSchema(), { name: 'John', age: 30 });
      new ValueTree(root, mockAdapter);

      expect(makeObservableMock).toHaveBeenCalled();
    });

    it('works without adapter', () => {
      const tree = createTree(createSimpleSchema(), { name: 'John', age: 30 });

      expect(tree.isDirty).toBe(false);
    });
  });
});
