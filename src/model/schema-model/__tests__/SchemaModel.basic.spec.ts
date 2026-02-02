import { describe, it, expect } from '@jest/globals';
import { createSchemaModel } from '../SchemaModelImpl.js';
import {
  emptySchema,
  simpleSchema,
  nestedSchema,
  findNodeIdByName,
  findNestedNodeId,
} from './test-helpers.js';

describe('SchemaModel basic operations', () => {
  describe('initialization', () => {
    it('creates model from empty schema', () => {
      const model = createSchemaModel(emptySchema());

      expect(model.root().isObject()).toBe(true);
      expect(model.root().properties()).toHaveLength(0);
      expect(model.isDirty()).toBe(false);
    });

    it('creates model from schema with fields', () => {
      const model = createSchemaModel(simpleSchema());

      expect(model.root().properties()).toHaveLength(2);
      expect(model.isDirty()).toBe(false);
    });
  });

  describe('tree access', () => {
    it('returns root node', () => {
      const model = createSchemaModel(simpleSchema());

      const root = model.root();
      expect(root.isObject()).toBe(true);
    });

    it('finds node by id', () => {
      const model = createSchemaModel(simpleSchema());
      const nameId = findNodeIdByName(model, 'name');

      expect(nameId).toBeDefined();
      const node = model.nodeById(nameId!);
      expect(node.name()).toBe('name');
    });

    it('returns null node for unknown id', () => {
      const model = createSchemaModel(simpleSchema());

      const node = model.nodeById('unknown-id');
      expect(node.isNull()).toBe(true);
    });

    it('returns path for node', () => {
      const model = createSchemaModel(nestedSchema());
      const firstNameId = findNestedNodeId(model, 'user', 'firstName');

      expect(firstNameId).toBeDefined();
      const path = model.pathOf(firstNameId!);
      expect(path.asJsonPointer()).toBe('/properties/user/properties/firstName');
    });
  });

  describe('addField', () => {
    it('adds field to root', () => {
      const model = createSchemaModel(emptySchema());
      const rootId = model.root().id();

      const newNode = model.addField(rootId, 'newField', 'string');

      expect(newNode.name()).toBe('newField');
      expect(newNode.nodeType()).toBe('string');
      expect(model.root().properties()).toHaveLength(1);
      expect(model.isDirty()).toBe(true);
    });

    it('adds field to nested object', () => {
      const model = createSchemaModel(nestedSchema());
      const user = model.root().property('user');

      model.addField(user.id(), 'email', 'string');

      expect(user.properties()).toHaveLength(3);
      expect(user.property('email').nodeType()).toBe('string');
    });

    it('adds different field types', () => {
      const model = createSchemaModel(emptySchema());
      const rootId = model.root().id();

      model.addField(rootId, 'str', 'string');
      model.addField(rootId, 'num', 'number');
      model.addField(rootId, 'bool', 'boolean');
      model.addField(rootId, 'obj', 'object');
      model.addField(rootId, 'arr', 'array');

      const props = model.root().properties();
      expect(props).toHaveLength(5);

      expect(model.root().property('str').nodeType()).toBe('string');
      expect(model.root().property('num').nodeType()).toBe('number');
      expect(model.root().property('bool').nodeType()).toBe('boolean');
      expect(model.root().property('obj').isObject()).toBe(true);
      expect(model.root().property('arr').isArray()).toBe(true);
    });
  });

  describe('removeField', () => {
    it('removes field from root', () => {
      const model = createSchemaModel(simpleSchema());
      const nameId = findNodeIdByName(model, 'name');

      const result = model.removeField(nameId!);

      expect(result).toBe(true);
      expect(model.root().properties()).toHaveLength(1);
      expect(model.root().property('name').isNull()).toBe(true);
      expect(model.isDirty()).toBe(true);
    });

    it('removes nested field', () => {
      const model = createSchemaModel(nestedSchema());
      const firstNameId = findNestedNodeId(model, 'user', 'firstName');

      const result = model.removeField(firstNameId!);

      expect(result).toBe(true);
      const user = model.root().property('user');
      expect(user.properties()).toHaveLength(1);
    });

    it('returns false for root node', () => {
      const model = createSchemaModel(simpleSchema());
      const rootId = model.root().id();

      const result = model.removeField(rootId);

      expect(result).toBe(false);
    });

    it('returns false for unknown id', () => {
      const model = createSchemaModel(simpleSchema());

      const result = model.removeField('unknown-id');

      expect(result).toBe(false);
    });
  });

  describe('renameField', () => {
    it('renames field', () => {
      const model = createSchemaModel(simpleSchema());
      const nameId = findNodeIdByName(model, 'name');

      model.renameField(nameId!, 'fullName');

      expect(model.root().property('fullName').nodeType()).toBe('string');
      expect(model.root().property('name').isNull()).toBe(true);
      expect(model.isDirty()).toBe(true);
    });

    it('ignores unknown id', () => {
      const model = createSchemaModel(simpleSchema());

      model.renameField('unknown-id', 'newName');

      expect(model.root().properties()).toHaveLength(2);
    });
  });
});
