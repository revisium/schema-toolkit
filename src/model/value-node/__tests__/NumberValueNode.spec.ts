import type { JsonNumberSchema } from '../../../types/schema.types.js';
import { JsonSchemaTypeName } from '../../../types/schema.types.js';
import { NumberValueNode, resetNodeIdCounter } from '../index.js';

beforeEach(() => {
  resetNodeIdCounter();
});

const createSchema = (
  overrides: Partial<JsonNumberSchema> = {},
): JsonNumberSchema => ({
  type: JsonSchemaTypeName.Number,
  default: 0,
  ...overrides,
});

describe('NumberValueNode', () => {
  describe('construction', () => {
    it('creates node with value', () => {
      const node = new NumberValueNode(undefined, 'age', createSchema(), 25);

      expect(node.value).toBe(25);
      expect(node.name).toBe('age');
      expect(node.type).toBe('number');
    });

    it('uses default from schema when no value provided', () => {
      const node = new NumberValueNode(
        undefined,
        'count',
        createSchema({ default: 10 }),
      );

      expect(node.value).toBe(10);
    });

    it('uses 0 when no value and no default', () => {
      const node = new NumberValueNode(undefined, 'count', createSchema());

      expect(node.value).toBe(0);
    });

    it('uses provided id', () => {
      const node = new NumberValueNode('custom-id', 'count', createSchema());

      expect(node.id).toBe('custom-id');
    });

    it('generates id when not provided', () => {
      const node = new NumberValueNode(undefined, 'count', createSchema());

      expect(node.id).toBe('node-1');
    });
  });

  describe('setValue', () => {
    it('sets number value', () => {
      const node = new NumberValueNode(undefined, 'count', createSchema());

      node.setValue(42);

      expect(node.value).toBe(42);
    });

    it('converts string to number', () => {
      const node = new NumberValueNode(undefined, 'count', createSchema());

      node.setValue('42');

      expect(node.value).toBe(42);
    });

    it('converts invalid string to 0', () => {
      const node = new NumberValueNode(undefined, 'count', createSchema());

      node.setValue('not a number');

      expect(node.value).toBe(0);
    });

    it('converts null to 0', () => {
      const node = new NumberValueNode(undefined, 'count', createSchema());

      node.setValue(null);

      expect(node.value).toBe(0);
    });

    it('converts boolean to number', () => {
      const node = new NumberValueNode(undefined, 'count', createSchema());

      node.setValue(true);

      expect(node.value).toBe(1);
    });
  });

  describe('validation - minimum', () => {
    it('returns error when below minimum', () => {
      const node = new NumberValueNode(
        undefined,
        'age',
        createSchema({ minimum: 18 }),
        10,
      );

      const errors = node.errors;

      expect(errors).toHaveLength(1);
      expect(errors[0]?.type).toBe('min');
      expect(errors[0]?.params).toEqual({ min: 18, actual: 10 });
    });

    it('returns no error when at minimum', () => {
      const node = new NumberValueNode(
        undefined,
        'age',
        createSchema({ minimum: 18 }),
        18,
      );

      expect(node.errors).toHaveLength(0);
    });

    it('returns no error when above minimum', () => {
      const node = new NumberValueNode(
        undefined,
        'age',
        createSchema({ minimum: 18 }),
        25,
      );

      expect(node.errors).toHaveLength(0);
    });
  });

  describe('validation - maximum', () => {
    it('returns error when above maximum', () => {
      const node = new NumberValueNode(
        undefined,
        'score',
        createSchema({ maximum: 100 }),
        150,
      );

      const errors = node.errors;

      expect(errors).toHaveLength(1);
      expect(errors[0]?.type).toBe('max');
      expect(errors[0]?.params).toEqual({ max: 100, actual: 150 });
    });

    it('returns no error when at maximum', () => {
      const node = new NumberValueNode(
        undefined,
        'score',
        createSchema({ maximum: 100 }),
        100,
      );

      expect(node.errors).toHaveLength(0);
    });

    it('returns no error when below maximum', () => {
      const node = new NumberValueNode(
        undefined,
        'score',
        createSchema({ maximum: 100 }),
        50,
      );

      expect(node.errors).toHaveLength(0);
    });
  });

  describe('validation - enum', () => {
    it('returns error when value not in enum', () => {
      const node = new NumberValueNode(
        undefined,
        'status',
        createSchema({ enum: [1, 2, 3] }),
        5,
      );

      const errors = node.errors;

      expect(errors).toHaveLength(1);
      expect(errors[0]?.type).toBe('enum');
      expect(errors[0]?.params).toEqual({ allowed: [1, 2, 3], actual: 5 });
    });

    it('returns no error when value in enum', () => {
      const node = new NumberValueNode(
        undefined,
        'status',
        createSchema({ enum: [1, 2, 3] }),
        2,
      );

      expect(node.errors).toHaveLength(0);
    });
  });

  describe('dirty tracking', () => {
    it('isDirty is false initially', () => {
      const node = new NumberValueNode(undefined, 'count', createSchema(), 10);

      expect(node.isDirty).toBe(false);
    });

    it('isDirty is true after setValue', () => {
      const node = new NumberValueNode(undefined, 'count', createSchema(), 10);

      node.setValue(20);

      expect(node.isDirty).toBe(true);
    });

    it('commit updates baseValue', () => {
      const node = new NumberValueNode(undefined, 'count', createSchema(), 10);
      node.setValue(20);

      node.commit();

      expect(node.baseValue).toBe(20);
      expect(node.isDirty).toBe(false);
    });

    it('revert restores value', () => {
      const node = new NumberValueNode(undefined, 'count', createSchema(), 10);
      node.setValue(20);

      node.revert();

      expect(node.value).toBe(10);
      expect(node.isDirty).toBe(false);
    });
  });

  describe('defaultValue', () => {
    it('returns default from schema', () => {
      const node = new NumberValueNode(
        undefined,
        'count',
        createSchema({ default: 42 }),
      );

      expect(node.defaultValue).toBe(42);
    });

    it('returns 0 when no default in schema', () => {
      const node = new NumberValueNode(undefined, 'count', createSchema());

      expect(node.defaultValue).toBe(0);
    });
  });

  describe('getPlainValue', () => {
    it('returns number value', () => {
      const node = new NumberValueNode(undefined, 'count', createSchema(), 42);

      expect(node.getPlainValue()).toBe(42);
    });
  });

  describe('type checks', () => {
    it('isPrimitive returns true', () => {
      const node = new NumberValueNode(undefined, 'count', createSchema());

      expect(node.isPrimitive()).toBe(true);
    });

    it('isObject returns false', () => {
      const node = new NumberValueNode(undefined, 'count', createSchema());

      expect(node.isObject()).toBe(false);
    });

    it('isArray returns false', () => {
      const node = new NumberValueNode(undefined, 'count', createSchema());

      expect(node.isArray()).toBe(false);
    });
  });
});
