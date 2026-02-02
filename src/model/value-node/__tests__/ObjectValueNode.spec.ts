import type { JsonObjectSchema } from '../../../types/schema.types.js';
import { JsonSchemaTypeName } from '../../../types/schema.types.js';
import {
  ObjectValueNode,
  StringValueNode,
  NumberValueNode,
  resetNodeIdCounter,
} from '../index.js';

beforeEach(() => {
  resetNodeIdCounter();
});

const createSchema = (
  properties: JsonObjectSchema['properties'] = {},
): JsonObjectSchema => ({
  type: JsonSchemaTypeName.Object,
  properties,
  additionalProperties: false,
  required: Object.keys(properties),
});

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
        { type: JsonSchemaTypeName.String, default: '' },
        'John',
      );
      const ageNode = new NumberValueNode(
        undefined,
        'age',
        { type: JsonSchemaTypeName.Number, default: 0 },
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
        { type: JsonSchemaTypeName.String, default: '' },
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
        { type: JsonSchemaTypeName.String, default: '' },
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
        { type: JsonSchemaTypeName.String, default: '' },
        'John',
      );
      const ageNode = new NumberValueNode(
        undefined,
        'age',
        { type: JsonSchemaTypeName.Number, default: 0 },
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
        { type: JsonSchemaTypeName.String, default: '' },
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
        { type: JsonSchemaTypeName.String, default: '' },
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
        { type: JsonSchemaTypeName.String, default: '' },
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
        { type: JsonSchemaTypeName.String, default: '' },
        'John',
      );
      const node = new ObjectValueNode(undefined, 'user', createSchema(), [
        oldNode,
      ]);

      const newNode = new StringValueNode(
        undefined,
        'name',
        { type: JsonSchemaTypeName.String, default: '' },
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
        { type: JsonSchemaTypeName.String, default: '' },
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
        { type: JsonSchemaTypeName.String, default: '' },
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
        { type: JsonSchemaTypeName.String, default: '' },
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
        { type: JsonSchemaTypeName.String, default: '' },
        'John',
      );
      node.addChild(nameNode);

      expect(node.isDirty).toBe(true);
    });

    it('isDirty is true when child removed', () => {
      const nameNode = new StringValueNode(
        undefined,
        'name',
        { type: JsonSchemaTypeName.String, default: '' },
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
        { type: JsonSchemaTypeName.String, default: '' },
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
        { type: JsonSchemaTypeName.String, default: '' },
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
        { type: JsonSchemaTypeName.String, default: '' },
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
        { type: JsonSchemaTypeName.String, default: '', required: true },
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
        { type: JsonSchemaTypeName.String, default: '' },
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
        { type: JsonSchemaTypeName.String, default: '', required: true },
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
        { type: JsonSchemaTypeName.String, default: '' },
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
