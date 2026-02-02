import type { JsonArraySchema, JsonObjectSchema } from '../../../types/schema.types.js';
import { JsonSchemaTypeName } from '../../../types/schema.types.js';
import type { ReactivityAdapter } from '../../../core/reactivity/types.js';
import { StringValueNode, resetNodeIdCounter } from '../index.js';
import { NumberValueNode } from '../NumberValueNode.js';
import { ObjectValueNode } from '../ObjectValueNode.js';
import { ArrayValueNode } from '../ArrayValueNode.js';
import { createNodeFactory } from '../NodeFactory.js';

const createMockReactivity = (): ReactivityAdapter => {
  return {
    makeObservable: () => {},
    observableArray: <T>(): T[] => [],
    observableMap: <K, V>(): Map<K, V> => new Map<K, V>(),
    reaction: () => () => {},
    runInAction: <T>(fn: () => T): T => fn(),
  };
};

beforeEach(() => {
  resetNodeIdCounter();
});

describe('Value nodes with reactivity', () => {
  describe('StringValueNode', () => {
    it('initializes observable when reactivity provided', () => {
      const reactivity = createMockReactivity();

      const node = new StringValueNode(
        'id',
        'name',
        { type: JsonSchemaTypeName.String, default: '' },
        'value',
        reactivity,
      );

      expect(node.value).toBe('value');
    });
  });

  describe('NumberValueNode', () => {
    it('initializes observable when reactivity provided', () => {
      const reactivity = createMockReactivity();

      const node = new NumberValueNode(
        'id',
        'count',
        { type: JsonSchemaTypeName.Number, default: 0 },
        42,
        reactivity,
      );

      expect(node.value).toBe(42);
    });
  });

  describe('ObjectValueNode', () => {
    it('uses observable map when reactivity provided', () => {
      const reactivity = createMockReactivity();
      const child = new StringValueNode(
        'c1',
        'name',
        { type: JsonSchemaTypeName.String, default: '' },
        'test',
      );

      const node = new ObjectValueNode(
        'id',
        'root',
        {
          type: JsonSchemaTypeName.Object,
          properties: {},
          additionalProperties: false,
          required: [],
        },
        [child],
        reactivity,
      );

      expect(node.children).toHaveLength(1);
      expect(node.child('name')).toBe(child);
    });

    it('revert uses observable map', () => {
      const reactivity = createMockReactivity();
      const child = new StringValueNode(
        'c1',
        'name',
        { type: JsonSchemaTypeName.String, default: '' },
        'test',
      );
      const node = new ObjectValueNode(
        'id',
        'root',
        {
          type: JsonSchemaTypeName.Object,
          properties: {},
          additionalProperties: false,
          required: [],
        },
        [child],
        reactivity,
      );
      node.commit();

      node.removeChild('name');
      node.revert();

      expect(node.child('name')).toBe(child);
    });
  });

  describe('ArrayValueNode', () => {
    it('uses observable array when reactivity provided', () => {
      const reactivity = createMockReactivity();
      const item = new StringValueNode(
        'i1',
        '0',
        { type: JsonSchemaTypeName.String, default: '' },
        'a',
      );

      const schema: JsonArraySchema = {
        type: JsonSchemaTypeName.Array,
        items: { type: JsonSchemaTypeName.String, default: '' },
      };
      const node = new ArrayValueNode('id', 'items', schema, [item], reactivity);

      expect(node.length).toBe(1);
      expect(node.at(0)).toBe(item);
    });

    it('revert uses observable array', () => {
      const reactivity = createMockReactivity();
      const item = new StringValueNode(
        'i1',
        '0',
        { type: JsonSchemaTypeName.String, default: '' },
        'a',
      );
      const schema: JsonArraySchema = {
        type: JsonSchemaTypeName.Array,
        items: { type: JsonSchemaTypeName.String, default: '' },
      };
      const node = new ArrayValueNode('id', 'items', schema, [item], reactivity);
      node.commit();

      node.removeAt(0);
      node.revert();

      expect(node.length).toBe(1);
      expect(node.at(0)).toBe(item);
    });
  });

  describe('NodeFactory with reactivity', () => {
    it('passes reactivity to created nodes', () => {
      const reactivity = createMockReactivity();
      const factory = createNodeFactory({ reactivity });

      const schema: JsonObjectSchema = {
        type: JsonSchemaTypeName.Object,
        properties: {
          name: { type: JsonSchemaTypeName.String, default: '' },
          tags: {
            type: JsonSchemaTypeName.Array,
            items: { type: JsonSchemaTypeName.String, default: '' },
          },
        },
        additionalProperties: false,
        required: ['name', 'tags'],
      };

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
      const reactivity = createMockReactivity();
      const factory = createNodeFactory({ reactivity });

      const schema: JsonArraySchema = {
        type: JsonSchemaTypeName.Array,
        items: {
          type: JsonSchemaTypeName.Object,
          properties: {
            values: {
              type: JsonSchemaTypeName.Array,
              items: { type: JsonSchemaTypeName.Number, default: 0 },
            },
          },
          additionalProperties: false,
          required: ['values'],
        },
      };

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
