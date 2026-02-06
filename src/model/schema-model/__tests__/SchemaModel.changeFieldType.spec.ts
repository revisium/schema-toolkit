import { describe, it, expect } from '@jest/globals';
import { obj, str, num, arr } from '../../../mocks/schema.mocks.js';
import { createSchemaModel } from '../SchemaModelImpl.js';
import type { JsonSchema } from '../../../types/index.js';
import type { RefSchemas } from '../types.js';

const customRefSchemas: RefSchemas = {
  'urn:custom:schema': obj({
    id: str(),
    value: num(),
  }) as unknown as JsonSchema,
};

describe('SchemaModel.changeFieldType', () => {
  describe('simple type changes', () => {
    it('changes string to number', () => {
      const model = createSchemaModel(obj({ field: str() }));
      const fieldId = model.root.property('field').id();

      const newNode = model.changeFieldType(fieldId, 'number');

      expect(newNode.nodeType()).toBe('number');
      expect(newNode.defaultValue()).toBe(0);
    });

    it('changes number to boolean', () => {
      const model = createSchemaModel(obj({ field: num() }));
      const fieldId = model.root.property('field').id();

      const newNode = model.changeFieldType(fieldId, 'boolean');

      expect(newNode.nodeType()).toBe('boolean');
      expect(newNode.defaultValue()).toBe(false);
    });
  });

  describe('primitive to array transformation', () => {
    it('wraps string in array<string>', () => {
      const model = createSchemaModel(obj({ tags: str({ default: 'test' }) }));
      const fieldId = model.root.property('tags').id();

      const newNode = model.changeFieldType(fieldId, 'array');

      expect(newNode.nodeType()).toBe('array');
      expect(newNode.items().nodeType()).toBe('string');
      expect(newNode.items().defaultValue()).toBe('test');
    });

    it('wraps number in array<number>', () => {
      const model = createSchemaModel(obj({ scores: num({ default: 100 }) }));
      const fieldId = model.root.property('scores').id();

      const newNode = model.changeFieldType(fieldId, 'array');

      expect(newNode.nodeType()).toBe('array');
      expect(newNode.items().nodeType()).toBe('number');
      expect(newNode.items().defaultValue()).toBe(100);
    });
  });

  describe('object to array transformation', () => {
    it('wraps object in array<object>', () => {
      const model = createSchemaModel(obj({ item: obj({ name: str() }) }));
      const fieldId = model.root.property('item').id();

      const newNode = model.changeFieldType(fieldId, 'array');

      expect(newNode.nodeType()).toBe('array');
      expect(newNode.items().nodeType()).toBe('object');
      expect(newNode.items().property('name').nodeType()).toBe('string');
    });
  });

  describe('array to primitive (matching items)', () => {
    it('extracts string from array<string>', () => {
      const model = createSchemaModel(obj({ tags: arr(str()) }));
      const fieldId = model.root.property('tags').id();

      const newNode = model.changeFieldType(fieldId, 'string');

      expect(newNode.nodeType()).toBe('string');
    });

    it('extracts number from array<number>', () => {
      const model = createSchemaModel(obj({ scores: arr(num()) }));
      const fieldId = model.root.property('scores').id();

      const newNode = model.changeFieldType(fieldId, 'number');

      expect(newNode.nodeType()).toBe('number');
    });
  });

  describe('spec object with options', () => {
    it('applies default value from spec', () => {
      const model = createSchemaModel(obj({ field: num() }));
      const fieldId = model.root.property('field').id();

      const newNode = model.changeFieldType(fieldId, { type: 'string', default: 'N/A' });

      expect(newNode.nodeType()).toBe('string');
      expect(newNode.defaultValue()).toBe('N/A');
    });

    it('applies metadata from spec', () => {
      const model = createSchemaModel(obj({ field: str() }));
      const fieldId = model.root.property('field').id();

      const newNode = model.changeFieldType(fieldId, {
        type: 'number',
        title: 'Price',
        description: 'Item price',
        deprecated: true,
      });

      expect(newNode.metadata().title).toBe('Price');
      expect(newNode.metadata().description).toBe('Item price');
      expect(newNode.metadata().deprecated).toBe(true);
    });

    it('applies foreignKey for string type', () => {
      const model = createSchemaModel(obj({ field: num() }));
      const fieldId = model.root.property('field').id();

      const newNode = model.changeFieldType(fieldId, {
        type: 'string',
        foreignKey: 'users.id',
      });

      expect(newNode.foreignKey()).toBe('users.id');
    });
  });

  describe('$ref transformation', () => {
    it('creates ref node without refSchemas', () => {
      const model = createSchemaModel(obj({ avatar: str() }));
      const fieldId = model.root.property('avatar').id();

      const newNode = model.changeFieldType(fieldId, {
        $ref: 'urn:jsonschema:io:revisium:file-schema:1.0.0',
      });

      expect(newNode.nodeType()).toBe('ref');
      expect(newNode.ref()).toBe('urn:jsonschema:io:revisium:file-schema:1.0.0');
    });

    it('resolves ref with refSchemas', () => {
      const model = createSchemaModel(obj({ data: str() }), { refSchemas: customRefSchemas });
      const fieldId = model.root.property('data').id();

      const newNode = model.changeFieldType(fieldId, { $ref: 'urn:custom:schema' });

      expect(newNode.nodeType()).toBe('object');
      expect(newNode.isRef()).toBe(true);
      expect(newNode.properties()).toHaveLength(2);
      expect(newNode.property('id').nodeType()).toBe('string');
      expect(newNode.property('value').nodeType()).toBe('number');
    });
  });

  describe('plainSchema serialization', () => {
    it('serializes $ref correctly', () => {
      const model = createSchemaModel(obj({ data: str() }), { refSchemas: customRefSchemas });
      const fieldId = model.root.property('data').id();

      model.changeFieldType(fieldId, { $ref: 'urn:custom:schema' });

      expect(model.plainSchema.properties.data).toEqual({ $ref: 'urn:custom:schema' });
    });
  });

  describe('patch tracking', () => {
    it('tracks replacement correctly', () => {
      const model = createSchemaModel(obj({ field: str() }));
      const fieldId = model.root.property('field').id();

      model.changeFieldType(fieldId, 'number');

      expect(model.isDirty).toBe(true);
      expect(model.patches).toHaveLength(1);
      expect(model.patches[0]?.patch.op).toBe('replace');
    });
  });
});
