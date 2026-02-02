import type { JsonBooleanSchema } from '../../../types/schema.types.js';
import { JsonSchemaTypeName } from '../../../types/schema.types.js';
import { BooleanValueNode, resetNodeIdCounter } from '../index.js';

beforeEach(() => {
  resetNodeIdCounter();
});

const createSchema = (
  overrides: Partial<JsonBooleanSchema> = {},
): JsonBooleanSchema => ({
  type: JsonSchemaTypeName.Boolean,
  default: false,
  ...overrides,
});

describe('BooleanValueNode', () => {
  describe('construction', () => {
    it('creates node with value', () => {
      const node = new BooleanValueNode(
        undefined,
        'active',
        createSchema(),
        true,
      );

      expect(node.value).toBe(true);
      expect(node.name).toBe('active');
      expect(node.type).toBe('boolean');
    });

    it('uses default from schema when no value provided', () => {
      const node = new BooleanValueNode(
        undefined,
        'enabled',
        createSchema({ default: true }),
      );

      expect(node.value).toBe(true);
    });

    it('uses false when no value and no default', () => {
      const node = new BooleanValueNode(undefined, 'flag', createSchema());

      expect(node.value).toBe(false);
    });

    it('uses provided id', () => {
      const node = new BooleanValueNode('custom-id', 'flag', createSchema());

      expect(node.id).toBe('custom-id');
    });

    it('generates id when not provided', () => {
      const node = new BooleanValueNode(undefined, 'flag', createSchema());

      expect(node.id).toBe('node-1');
    });
  });

  describe('setValue', () => {
    it('sets boolean value', () => {
      const node = new BooleanValueNode(undefined, 'flag', createSchema());

      node.setValue(true);

      expect(node.value).toBe(true);
    });

    it('converts truthy string to true', () => {
      const node = new BooleanValueNode(undefined, 'flag', createSchema());

      node.setValue('yes');

      expect(node.value).toBe(true);
    });

    it('converts empty string to false', () => {
      const node = new BooleanValueNode(
        undefined,
        'flag',
        createSchema(),
        true,
      );

      node.setValue('');

      expect(node.value).toBe(false);
    });

    it('converts number 1 to true', () => {
      const node = new BooleanValueNode(undefined, 'flag', createSchema());

      node.setValue(1);

      expect(node.value).toBe(true);
    });

    it('converts number 0 to false', () => {
      const node = new BooleanValueNode(
        undefined,
        'flag',
        createSchema(),
        true,
      );

      node.setValue(0);

      expect(node.value).toBe(false);
    });

    it('converts null to false', () => {
      const node = new BooleanValueNode(
        undefined,
        'flag',
        createSchema(),
        true,
      );

      node.setValue(null);

      expect(node.value).toBe(false);
    });
  });

  describe('dirty tracking', () => {
    it('isDirty is false initially', () => {
      const node = new BooleanValueNode(
        undefined,
        'flag',
        createSchema(),
        false,
      );

      expect(node.isDirty).toBe(false);
    });

    it('isDirty is true after setValue', () => {
      const node = new BooleanValueNode(
        undefined,
        'flag',
        createSchema(),
        false,
      );

      node.setValue(true);

      expect(node.isDirty).toBe(true);
    });

    it('commit updates baseValue', () => {
      const node = new BooleanValueNode(
        undefined,
        'flag',
        createSchema(),
        false,
      );
      node.setValue(true);

      node.commit();

      expect(node.baseValue).toBe(true);
      expect(node.isDirty).toBe(false);
    });

    it('revert restores value', () => {
      const node = new BooleanValueNode(
        undefined,
        'flag',
        createSchema(),
        false,
      );
      node.setValue(true);

      node.revert();

      expect(node.value).toBe(false);
      expect(node.isDirty).toBe(false);
    });
  });

  describe('defaultValue', () => {
    it('returns default from schema', () => {
      const node = new BooleanValueNode(
        undefined,
        'flag',
        createSchema({ default: true }),
      );

      expect(node.defaultValue).toBe(true);
    });

    it('returns false when no default in schema', () => {
      const node = new BooleanValueNode(undefined, 'flag', createSchema());

      expect(node.defaultValue).toBe(false);
    });
  });

  describe('getPlainValue', () => {
    it('returns boolean value', () => {
      const node = new BooleanValueNode(
        undefined,
        'flag',
        createSchema(),
        true,
      );

      expect(node.getPlainValue()).toBe(true);
    });
  });

  describe('type checks', () => {
    it('isPrimitive returns true', () => {
      const node = new BooleanValueNode(undefined, 'flag', createSchema());

      expect(node.isPrimitive()).toBe(true);
    });

    it('isObject returns false', () => {
      const node = new BooleanValueNode(undefined, 'flag', createSchema());

      expect(node.isObject()).toBe(false);
    });

    it('isArray returns false', () => {
      const node = new BooleanValueNode(undefined, 'flag', createSchema());

      expect(node.isArray()).toBe(false);
    });
  });

  describe('errors and warnings', () => {
    it('returns empty errors', () => {
      const node = new BooleanValueNode(undefined, 'flag', createSchema());

      expect(node.errors).toHaveLength(0);
    });

    it('isValid returns true', () => {
      const node = new BooleanValueNode(undefined, 'flag', createSchema());

      expect(node.isValid).toBe(true);
    });
  });
});
