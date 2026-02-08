import type { JsonObjectSchema } from '../../../types/schema.types.js';
import {
  ObjectValueNode,
  StringValueNode,
  NumberValueNode,
  createNodeFactory,
  resetNodeIdCounter,
} from '../index.js';
import { obj, str, num, arr } from '../../../mocks/schema.mocks.js';

beforeEach(() => {
  resetNodeIdCounter();
});

const createSchema = (properties: JsonObjectSchema['properties'] = {}): JsonObjectSchema =>
  obj(properties);

describe('ObjectValueNode', () => {
  describe('construction', () => {
    it('creates empty object node', () => {
      const node = new ObjectValueNode(undefined, 'user', createSchema());

      expect(node.type).toBe('object');
      expect(node.name).toBe('user');
      expect(node.children).toHaveLength(0);
    });

    it('creates object node with children', () => {
      const nameNode = new StringValueNode(
        undefined,
        'name',
        str(),
        'John',
      );
      const ageNode = new NumberValueNode(
        undefined,
        'age',
        num(),
        25,
      );

      const node = new ObjectValueNode(undefined, 'user', createSchema(), [
        nameNode,
        ageNode,
      ]);

      expect(node.children).toHaveLength(2);
      expect(node.child('name')).toBe(nameNode);
      expect(node.child('age')).toBe(ageNode);
    });

    it('sets parent on children', () => {
      const nameNode = new StringValueNode(
        undefined,
        'name',
        str(),
        'John',
      );

      const node = new ObjectValueNode(undefined, 'user', createSchema(), [
        nameNode,
      ]);

      expect(nameNode.parent).toBe(node);
    });

    it('uses provided id', () => {
      const node = new ObjectValueNode('custom-id', 'user', createSchema());

      expect(node.id).toBe('custom-id');
    });

    it('generates id when not provided', () => {
      const node = new ObjectValueNode(undefined, 'user', createSchema());

      expect(node.id).toBe('node-1');
    });
  });

  describe('value', () => {
    it('returns object with children', () => {
      const nameNode = new StringValueNode(
        undefined,
        'name',
        str(),
        'John',
      );

      const node = new ObjectValueNode(undefined, 'user', createSchema(), [
        nameNode,
      ]);

      expect(node.value).toEqual({ name: nameNode });
    });
  });

  describe('getPlainValue', () => {
    it('returns plain object', () => {
      const nameNode = new StringValueNode(
        undefined,
        'name',
        str(),
        'John',
      );
      const ageNode = new NumberValueNode(
        undefined,
        'age',
        num(),
        25,
      );

      const node = new ObjectValueNode(undefined, 'user', createSchema(), [
        nameNode,
        ageNode,
      ]);

      expect(node.getPlainValue()).toEqual({ name: 'John', age: 25 });
    });
  });

  describe('child', () => {
    it('returns child by name', () => {
      const nameNode = new StringValueNode(
        undefined,
        'name',
        str(),
        'John',
      );

      const node = new ObjectValueNode(undefined, 'user', createSchema(), [
        nameNode,
      ]);

      expect(node.child('name')).toBe(nameNode);
    });

    it('returns undefined for non-existent child', () => {
      const node = new ObjectValueNode(undefined, 'user', createSchema());

      expect(node.child('unknown')).toBeUndefined();
    });
  });

  describe('hasChild', () => {
    it('returns true for existing child', () => {
      const nameNode = new StringValueNode(
        undefined,
        'name',
        str(),
        'John',
      );

      const node = new ObjectValueNode(undefined, 'user', createSchema(), [
        nameNode,
      ]);

      expect(node.hasChild('name')).toBe(true);
    });

    it('returns false for non-existent child', () => {
      const node = new ObjectValueNode(undefined, 'user', createSchema());

      expect(node.hasChild('unknown')).toBe(false);
    });
  });

  describe('addChild', () => {
    it('adds new child', () => {
      const node = new ObjectValueNode(undefined, 'user', createSchema());
      const nameNode = new StringValueNode(
        undefined,
        'name',
        str(),
        'John',
      );

      node.addChild(nameNode);

      expect(node.child('name')).toBe(nameNode);
      expect(nameNode.parent).toBe(node);
    });

    it('replaces existing child', () => {
      const oldNode = new StringValueNode(
        undefined,
        'name',
        str(),
        'John',
      );
      const node = new ObjectValueNode(undefined, 'user', createSchema(), [
        oldNode,
      ]);

      const newNode = new StringValueNode(
        undefined,
        'name',
        str(),
        'Jane',
      );
      node.addChild(newNode);

      expect(node.child('name')).toBe(newNode);
      expect(oldNode.parent).toBeNull();
      expect(newNode.parent).toBe(node);
    });
  });

  describe('removeChild', () => {
    it('removes existing child', () => {
      const nameNode = new StringValueNode(
        undefined,
        'name',
        str(),
        'John',
      );
      const node = new ObjectValueNode(undefined, 'user', createSchema(), [
        nameNode,
      ]);

      node.removeChild('name');

      expect(node.child('name')).toBeUndefined();
      expect(nameNode.parent).toBeNull();
    });

    it('does nothing for non-existent child', () => {
      const node = new ObjectValueNode(undefined, 'user', createSchema());

      node.removeChild('unknown');

      expect(node.children).toHaveLength(0);
    });
  });

  describe('dirty tracking', () => {
    it('isDirty is false initially', () => {
      const nameNode = new StringValueNode(
        undefined,
        'name',
        str(),
        'John',
      );
      const node = new ObjectValueNode(undefined, 'user', createSchema(), [
        nameNode,
      ]);

      expect(node.isDirty).toBe(false);
    });

    it('isDirty is true when child value changes', () => {
      const nameNode = new StringValueNode(
        undefined,
        'name',
        str(),
        'John',
      );
      const node = new ObjectValueNode(undefined, 'user', createSchema(), [
        nameNode,
      ]);

      nameNode.setValue('Jane');

      expect(node.isDirty).toBe(true);
    });

    it('isDirty is true when child added', () => {
      const node = new ObjectValueNode(undefined, 'user', createSchema());
      node.commit();

      const nameNode = new StringValueNode(
        undefined,
        'name',
        str(),
        'John',
      );
      node.addChild(nameNode);

      expect(node.isDirty).toBe(true);
    });

    it('isDirty is true when child removed', () => {
      const nameNode = new StringValueNode(
        undefined,
        'name',
        str(),
        'John',
      );
      const node = new ObjectValueNode(undefined, 'user', createSchema(), [
        nameNode,
      ]);
      node.commit();

      node.removeChild('name');

      expect(node.isDirty).toBe(true);
    });

    it('commit updates baseChildren', () => {
      const nameNode = new StringValueNode(
        undefined,
        'name',
        str(),
        'John',
      );
      const node = new ObjectValueNode(undefined, 'user', createSchema(), [
        nameNode,
      ]);

      nameNode.setValue('Jane');
      node.commit();

      expect(node.isDirty).toBe(false);
      expect(nameNode.isDirty).toBe(false);
    });

    it('revert restores children', () => {
      const nameNode = new StringValueNode(
        undefined,
        'name',
        str(),
        'John',
      );
      const node = new ObjectValueNode(undefined, 'user', createSchema(), [
        nameNode,
      ]);
      node.commit();

      nameNode.setValue('Jane');
      node.revert();

      expect(nameNode.value).toBe('John');
      expect(node.isDirty).toBe(false);
    });

    it('revert restores removed children', () => {
      const nameNode = new StringValueNode(
        undefined,
        'name',
        str(),
        'John',
      );
      const node = new ObjectValueNode(undefined, 'user', createSchema(), [
        nameNode,
      ]);
      node.commit();

      node.removeChild('name');
      node.revert();

      expect(node.child('name')).toBe(nameNode);
      expect(nameNode.parent).toBe(node);
    });
  });

  describe('errors and warnings', () => {
    it('collects errors from children', () => {
      const nameNode = new StringValueNode(
        undefined,
        'name',
        str({ required: true }),
        '',
      );
      const node = new ObjectValueNode(undefined, 'user', createSchema(), [
        nameNode,
      ]);

      expect(node.errors).toHaveLength(1);
      expect(node.errors[0]?.type).toBe('required');
    });

    it('collects warnings from children', () => {
      const nameNode = new StringValueNode(
        undefined,
        'name',
        str(),
        'John',
      );
      nameNode.setFormulaWarning({
        type: 'type-coercion',
        message: 'test',
        expression: 'test',
        computedValue: 42,
      });
      const node = new ObjectValueNode(undefined, 'user', createSchema(), [
        nameNode,
      ]);

      expect(node.warnings).toHaveLength(1);
      expect(node.warnings[0]?.type).toBe('type-coercion');
    });

    it('isValid is false when child has errors', () => {
      const nameNode = new StringValueNode(
        undefined,
        'name',
        str({ required: true }),
        '',
      );
      const node = new ObjectValueNode(undefined, 'user', createSchema(), [
        nameNode,
      ]);

      expect(node.isValid).toBe(false);
    });

    it('hasWarnings is true when child has warnings', () => {
      const nameNode = new StringValueNode(
        undefined,
        'name',
        str(),
        'John',
      );
      nameNode.setFormulaWarning({
        type: 'type-coercion',
        message: 'test',
        expression: 'test',
        computedValue: 42,
      });
      const node = new ObjectValueNode(undefined, 'user', createSchema(), [
        nameNode,
      ]);

      expect(node.hasWarnings).toBe(true);
    });
  });

  describe('setValue', () => {
    it('updates existing children', () => {
      const nameNode = new StringValueNode(undefined, 'name', str(), 'John');
      const ageNode = new NumberValueNode(undefined, 'age', num(), 25);
      const node = new ObjectValueNode(undefined, 'user', createSchema(), [
        nameNode,
        ageNode,
      ]);

      node.setValue({ name: 'Jane', age: 30 });

      expect(nameNode.value).toBe('Jane');
      expect(ageNode.value).toBe(30);
    });

    it('updates only keys present in value', () => {
      const nameNode = new StringValueNode(undefined, 'name', str(), 'John');
      const ageNode = new NumberValueNode(undefined, 'age', num(), 25);
      const node = new ObjectValueNode(undefined, 'user', createSchema(), [
        nameNode,
        ageNode,
      ]);

      node.setValue({ name: 'Jane' });

      expect(nameNode.value).toBe('Jane');
      expect(ageNode.value).toBe(25);
    });

    it('ignores unknown keys', () => {
      const nameNode = new StringValueNode(undefined, 'name', str(), 'John');
      const node = new ObjectValueNode(undefined, 'user', createSchema(), [
        nameNode,
      ]);

      node.setValue({ name: 'Jane', unknown: 'value' });

      expect(nameNode.value).toBe('Jane');
      expect(node.hasChild('unknown')).toBe(false);
    });

    it('recursively updates nested objects', () => {
      const factory = createNodeFactory();
      const schema = obj({
        address: obj({
          city: str(),
          zip: str(),
        }),
      });
      const root = factory.createTree(schema, {
        address: { city: 'NYC', zip: '10001' },
      }) as ObjectValueNode;

      root.setValue({ address: { city: 'LA' } });

      expect(root.child('address')?.isObject()).toBe(true);
      const address = root.child('address') as ObjectValueNode;
      expect(address.child('city')?.getPlainValue()).toBe('LA');
      expect(address.child('zip')?.getPlainValue()).toBe('10001');
    });

    it('recursively updates nested arrays', () => {
      const factory = createNodeFactory();
      const schema = obj({
        tags: arr(str()),
      });
      const root = factory.createTree(schema, {
        tags: ['a', 'b'],
      }) as ObjectValueNode;

      root.setValue({ tags: ['x', 'y'] });

      expect(root.child('tags')?.getPlainValue()).toEqual(['x', 'y']);
    });

    it('recursively updates deeply nested structure', () => {
      const factory = createNodeFactory();
      const schema = obj({
        level1: obj({
          level2: obj({
            value: str(),
          }),
        }),
      });
      const root = factory.createTree(schema, {
        level1: { level2: { value: 'deep' } },
      }) as ObjectValueNode;

      root.setValue({ level1: { level2: { value: 'updated' } } });

      expect(root.getPlainValue()).toEqual({
        level1: { level2: { value: 'updated' } },
      });
    });

    it('updates object with mixed children types', () => {
      const factory = createNodeFactory();
      const schema = obj({
        name: str(),
        scores: arr(num()),
        meta: obj({
          active: str(),
        }),
      });
      const root = factory.createTree(schema, {
        name: 'Alice',
        scores: [10, 20],
        meta: { active: 'yes' },
      }) as ObjectValueNode;

      root.setValue({
        name: 'Bob',
        scores: [30, 40, 50],
        meta: { active: 'no' },
      });

      expect(root.getPlainValue()).toEqual({
        name: 'Bob',
        scores: [30, 40, 50],
        meta: { active: 'no' },
      });
    });

    it('updates array of objects inside object', () => {
      const factory = createNodeFactory();
      const schema = obj({
        users: arr(
          obj({
            name: str(),
            address: obj({
              city: str(),
            }),
          }),
        ),
      });
      const root = factory.createTree(schema, {
        users: [
          { name: 'Alice', address: { city: 'NYC' } },
          { name: 'Bob', address: { city: 'LA' } },
        ],
      }) as ObjectValueNode;

      root.setValue({
        users: [
          { name: 'Carol', address: { city: 'SF' } },
        ],
      });

      expect(root.getPlainValue()).toEqual({
        users: [
          { name: 'Carol', address: { city: 'SF' } },
        ],
      });
    });

    it('partial update preserves untouched nested fields', () => {
      const factory = createNodeFactory();
      const schema = obj({
        profile: obj({
          firstName: str(),
          lastName: str(),
          settings: obj({
            theme: str(),
            language: str(),
          }),
        }),
      });
      const root = factory.createTree(schema, {
        profile: {
          firstName: 'John',
          lastName: 'Doe',
          settings: { theme: 'dark', language: 'en' },
        },
      }) as ObjectValueNode;

      root.setValue({
        profile: {
          firstName: 'Jane',
          settings: { theme: 'light' },
        },
      });

      expect(root.getPlainValue()).toEqual({
        profile: {
          firstName: 'Jane',
          lastName: 'Doe',
          settings: { theme: 'light', language: 'en' },
        },
      });
    });

    it('propagates internal option to children', () => {
      const nameNode = new StringValueNode(
        undefined,
        'name',
        str({ readOnly: true }),
        'John',
      );
      const node = new ObjectValueNode(undefined, 'user', createSchema(), [
        nameNode,
      ]);

      node.setValue({ name: 'Jane' }, { internal: true });

      expect(nameNode.value).toBe('Jane');
    });

    it('respects readOnly without internal option', () => {
      const nameNode = new StringValueNode(
        undefined,
        'name',
        str({ readOnly: true }),
        'John',
      );
      const node = new ObjectValueNode(undefined, 'user', createSchema(), [
        nameNode,
      ]);

      expect(() => node.setValue({ name: 'Jane' })).toThrow(
        'Cannot set value on read-only field: name',
      );
    });
  });

  describe('type checks', () => {
    it('isObject returns true', () => {
      const node = new ObjectValueNode(undefined, 'user', createSchema());

      expect(node.isObject()).toBe(true);
    });

    it('isPrimitive returns false', () => {
      const node = new ObjectValueNode(undefined, 'user', createSchema());

      expect(node.isPrimitive()).toBe(false);
    });

    it('isArray returns false', () => {
      const node = new ObjectValueNode(undefined, 'user', createSchema());

      expect(node.isArray()).toBe(false);
    });
  });
});
