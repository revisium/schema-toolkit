import { describe, it, expect } from '@jest/globals';
import { obj, str, num, arr } from '../../../mocks/schema.mocks.js';
import type { Diagnostic } from '../../../core/validation/types.js';
import { FormulaEngine } from '../../value-formula/FormulaEngine.js';
import { createNodeFactory } from '../../value-node/NodeFactory.js';
import { StringValueNode } from '../../value-node/StringValueNode.js';
import type { ValueNode } from '../../value-node/types.js';
import { ValueType } from '../../value-node/types.js';
import { ValueTree } from '../ValueTree.js';

const createSimpleSchema = () =>
  obj({
    name: str(),
    age: num(),
  });

const createNestedSchema = () =>
  obj({
    name: str(),
    address: obj({
      city: str(),
    }),
  });

const createArraySchema = () =>
  obj({
    items: arr(
      obj({
        name: str(),
      }),
    ),
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

    it('sets value on object node', () => {
      const tree = createTree(createNestedSchema(), {
        name: 'John',
        address: { city: 'NYC' },
      });

      tree.setValue('address', { city: 'LA' });

      expect(tree.getValue('address.city')).toBe('LA');
    });

    it('sets value on array node', () => {
      const tree = createTree(createArraySchema(), {
        items: [{ name: 'Item 1' }, { name: 'Item 2' }],
      });

      tree.setValue('items', [{ name: 'A' }, { name: 'B' }]);

      expect(tree.getValue('items[0].name')).toBe('A');
      expect(tree.getValue('items[1].name')).toBe('B');
    });

    it('tracks change for object setValue', () => {
      const tree = createTree(createNestedSchema(), {
        name: 'John',
        address: { city: 'NYC' },
      });

      tree.setValue('address', { city: 'LA' });

      const patches = tree.getPatches();
      expect(patches).toHaveLength(1);
      expect(patches[0]).toEqual({
        op: 'replace',
        path: '/address',
        value: { city: 'LA' },
      });
    });

    it('sets deeply nested object value', () => {
      const schema = obj({
        profile: obj({
          name: str(),
          address: obj({
            city: str(),
            zip: str(),
          }),
        }),
      });
      const tree = createTree(schema, {
        profile: {
          name: 'John',
          address: { city: 'NYC', zip: '10001' },
        },
      });

      tree.setValue('profile', {
        name: 'Jane',
        address: { city: 'LA' },
      });

      expect(tree.getValue('profile.name')).toBe('Jane');
      expect(tree.getValue('profile.address.city')).toBe('LA');
      expect(tree.getValue('profile.address.zip')).toBe('10001');
    });

    it('sets array value with grow and shrink', () => {
      const schema = obj({
        items: arr(obj({ name: str() })),
      });
      const tree = createTree(schema, {
        items: [{ name: 'A' }],
      });

      tree.setValue('items', [
        { name: 'X' },
        { name: 'Y' },
        { name: 'Z' },
      ]);

      expect(tree.getPlainValue()).toEqual({
        items: [{ name: 'X' }, { name: 'Y' }, { name: 'Z' }],
      });
    });

    it('sets value on nested array item', () => {
      const tree = createTree(createArraySchema(), {
        items: [{ name: 'Item 1' }, { name: 'Item 2' }],
      });

      tree.setValue('items[0]', { name: 'Updated' });

      expect(tree.getValue('items[0].name')).toBe('Updated');
      expect(tree.getValue('items[1].name')).toBe('Item 2');
    });

    it('passes options to nested nodes', () => {
      const formulaSchema = obj({
        value: str({ formula: 'name' }),
      });
      const tree = createTree(formulaSchema, { value: '' });

      tree.setValue('value', 'computed', { internal: true });

      expect(tree.getValue('value')).toBe('computed');
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

    it('isDirty returns false when root has no isDirty property', () => {
      const minimalRoot: ValueNode = {
        id: 'mock-root',
        type: ValueType.String,
        schema: str(),
        parent: null,
        name: '',
        value: 'test',
        getPlainValue: () => 'test',
        isObject: () => false,
        isArray: () => false,
        isPrimitive: () => true,
        errors: [] as readonly Diagnostic[],
        warnings: [] as readonly Diagnostic[],
        isValid: true,
        hasWarnings: false,
      } as ValueNode;

      const tree = new ValueTree(minimalRoot);

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
    it('returns empty array when no changes', () => {
      const tree = createTree(createSimpleSchema(), { name: 'John', age: 30 });

      expect(tree.getPatches()).toEqual([]);
    });

    it('returns patch after setValue', () => {
      const tree = createTree(createSimpleSchema(), { name: 'John', age: 30 });
      tree.setValue('name', 'Jane');

      expect(tree.getPatches()).toEqual([
        { op: 'replace', path: '/name', value: 'Jane' },
      ]);
    });

    it('returns multiple patches for multiple changes', () => {
      const tree = createTree(createSimpleSchema(), { name: 'John', age: 30 });
      tree.setValue('name', 'Jane');
      tree.setValue('age', 25);

      expect(tree.getPatches()).toEqual([
        { op: 'replace', path: '/name', value: 'Jane' },
        { op: 'replace', path: '/age', value: 25 },
      ]);
    });

    it('clears patches after commit', () => {
      const tree = createTree(createSimpleSchema(), { name: 'John', age: 30 });
      tree.setValue('name', 'Jane');

      tree.commit();

      expect(tree.getPatches()).toEqual([]);
    });

    it('clears patches after revert', () => {
      const tree = createTree(createSimpleSchema(), { name: 'John', age: 30 });
      tree.setValue('name', 'Jane');

      tree.revert();

      expect(tree.getPatches()).toEqual([]);
    });

    it('returns patch with nested path', () => {
      const tree = createTree(createNestedSchema(), {
        name: 'John',
        address: { city: 'NYC' },
      });
      tree.setValue('address.city', 'LA');

      expect(tree.getPatches()).toEqual([
        { op: 'replace', path: '/address/city', value: 'LA' },
      ]);
    });
  });

  describe('nodeById', () => {
    it('returns node by id', () => {
      const tree = createTree(createSimpleSchema(), { name: 'John', age: 30 });
      const nameNode = tree.get('name');

      expect(nameNode).toBeDefined();

      const found = tree.nodeById(nameNode!.id);

      expect(found).toBe(nameNode);
    });

    it('returns root by id', () => {
      const tree = createTree(createSimpleSchema(), { name: 'John', age: 30 });

      const found = tree.nodeById(tree.root.id);

      expect(found).toBe(tree.root);
    });

    it('returns undefined for unknown id', () => {
      const tree = createTree(createSimpleSchema(), { name: 'John', age: 30 });

      expect(tree.nodeById('unknown-id')).toBeUndefined();
    });

    it('finds nested node by id', () => {
      const tree = createTree(createNestedSchema(), {
        name: 'John',
        address: { city: 'NYC' },
      });
      const cityNode = tree.get('address.city');

      expect(cityNode).toBeDefined();

      const found = tree.nodeById(cityNode!.id);

      expect(found).toBe(cityNode);
    });

    it('finds array item node by id', () => {
      const tree = createTree(createArraySchema(), {
        items: [{ name: 'Item 1' }],
      });
      const itemNode = tree.get('items[0]');

      expect(itemNode).toBeDefined();

      const found = tree.nodeById(itemNode!.id);

      expect(found).toBe(itemNode);
    });
  });

  describe('pathOf', () => {
    it('returns empty path for root', () => {
      const tree = createTree(createSimpleSchema(), { name: 'John', age: 30 });

      const path = tree.pathOf(tree.root);

      expect(path.isEmpty()).toBe(true);
    });

    it('returns path for child node', () => {
      const tree = createTree(createSimpleSchema(), { name: 'John', age: 30 });
      const nameNode = tree.get('name');

      expect(nameNode).toBeDefined();

      const path = tree.pathOf(nameNode!);

      expect(path.asString()).toBe('name');
      expect(path.asJsonPointer()).toBe('/name');
    });

    it('returns path for nested node', () => {
      const tree = createTree(createNestedSchema(), {
        name: 'John',
        address: { city: 'NYC' },
      });
      const cityNode = tree.get('address.city');

      expect(cityNode).toBeDefined();

      const path = tree.pathOf(cityNode!);

      expect(path.asString()).toBe('address.city');
      expect(path.asJsonPointer()).toBe('/address/city');
    });

    it('returns path for array item', () => {
      const tree = createTree(createArraySchema(), {
        items: [{ name: 'Item 1' }, { name: 'Item 2' }],
      });
      const itemNode = tree.get('items[1]');

      expect(itemNode).toBeDefined();

      const path = tree.pathOf(itemNode!);

      expect(path.asJsonPointer()).toBe('/items/1');
    });

    it('accepts node id as string', () => {
      const tree = createTree(createSimpleSchema(), { name: 'John', age: 30 });
      const nameNode = tree.get('name');

      expect(nameNode).toBeDefined();

      const path = tree.pathOf(nameNode!.id);

      expect(path.asString()).toBe('name');
    });

    it('returns empty path for unknown id', () => {
      const tree = createTree(createSimpleSchema(), { name: 'John', age: 30 });

      const path = tree.pathOf('unknown-id');

      expect(path.isEmpty()).toBe(true);
    });
  });

  describe('trackChange', () => {
    it('tracks change externally', () => {
      const tree = createTree(createSimpleSchema(), { name: 'John', age: 30 });
      const nameNode = tree.get('name');

      expect(nameNode).toBeDefined();

      tree.trackChange({
        type: 'setValue',
        path: tree.pathOf(nameNode!),
        value: 'Jane',
        oldValue: 'John',
      });

      expect(tree.getPatches()).toEqual([
        { op: 'replace', path: '/name', value: 'Jane' },
      ]);
    });
  });

  describe('rebuildIndex', () => {
    it('rebuilds tree index', () => {
      const tree = createTree(createSimpleSchema(), { name: 'John', age: 30 });
      const nameNode = tree.get('name');

      expect(nameNode).toBeDefined();

      tree.rebuildIndex();

      expect(tree.nodeById(nameNode!.id)).toBe(nameNode);
    });
  });

  describe('registerNode', () => {
    it('registers new node in index', () => {
      const tree = createTree(createSimpleSchema(), { name: 'John', age: 30 });

      const newNode = new StringValueNode(undefined, 'email', str(), 'test@example.com');
      if (tree.root.isObject()) {
        tree.root.addChild(newNode);
      }
      tree.registerNode(newNode);

      expect(tree.nodeById(newNode.id)).toBe(newNode);
    });
  });

  describe('invalidatePathsUnder', () => {
    it('invalidates cached paths under node', () => {
      const tree = createTree(createNestedSchema(), {
        name: 'John',
        address: { city: 'NYC' },
      });

      const addressNode = tree.get('address');
      const cityNode = tree.get('address.city');

      expect(addressNode).toBeDefined();
      expect(cityNode).toBeDefined();

      const path1 = tree.pathOf(cityNode!);
      expect(path1.asJsonPointer()).toBe('/address/city');

      tree.invalidatePathsUnder(addressNode!);

      const path2 = tree.pathOf(cityNode!);
      expect(path2.asJsonPointer()).toBe('/address/city');
    });
  });

  describe('get edge cases', () => {
    it('returns undefined when intermediate node in path is missing', () => {
      const tree = createTree(createArraySchema(), {
        items: [{ name: 'Item 1' }],
      });

      expect(tree.get('items[10].name')).toBeUndefined();
    });
  });

  describe('formulaEngine', () => {
    const createFormulaSchema = () =>
      obj({
        firstName: str(),
        lastName: str(),
        fullName: str({ formula: 'firstName + " " + lastName' }),
      });

    it('evaluates formulas when engine attached', () => {
      const tree = createTree(createFormulaSchema(), {
        firstName: 'John',
        lastName: 'Doe',
        fullName: '',
      });
      const engine = new FormulaEngine(tree);
      tree.setFormulaEngine(engine);

      expect(tree.getValue('fullName')).toBe('John Doe');
    });

    it('re-evaluates formulas on dependency change', () => {
      const tree = createTree(createFormulaSchema(), {
        firstName: 'John',
        lastName: 'Doe',
        fullName: '',
      });
      const engine = new FormulaEngine(tree);
      tree.setFormulaEngine(engine);

      tree.setValue('firstName', 'Jane');

      expect(tree.getValue('fullName')).toBe('Jane Doe');
    });

    it('returns formulaEngine', () => {
      const tree = createTree(createSimpleSchema(), { name: 'John', age: 30 });

      expect(tree.formulaEngine).toBeNull();

      const engine = new FormulaEngine(tree);
      tree.setFormulaEngine(engine);

      expect(tree.formulaEngine).toBe(engine);
    });
  });

  describe('dispose', () => {
    it('disposes formula engine', () => {
      const tree = createTree(createSimpleSchema(), { name: 'John', age: 30 });
      const engine = new FormulaEngine(tree);
      tree.setFormulaEngine(engine);

      tree.dispose();

      expect(tree.formulaEngine).toBeNull();
    });

    it('does not throw when no formula engine', () => {
      const tree = createTree(createSimpleSchema(), { name: 'John', age: 30 });

      expect(() => tree.dispose()).not.toThrow();
    });
  });
});
