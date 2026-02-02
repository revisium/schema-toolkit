import { describe, it, expect } from '@jest/globals';
import { serializeAst } from '@revisium/formula';
import { createSchemaModel } from '../SchemaModelImpl.js';
import {
  simpleSchema,
  schemaWithFormula,
  schemaWithForeignKey,
  schemaWithMetadata,
  findNodeIdByName,
} from './test-helpers.js';

describe('SchemaModel mutations', () => {
  describe('changeFieldType', () => {
    it('changes string to number', () => {
      const model = createSchemaModel(simpleSchema());
      const nameId = findNodeIdByName(model, 'name');

      const newNode = model.changeFieldType(nameId!, 'number');

      expect(newNode.nodeType()).toBe('number');
      expect(newNode.name()).toBe('name');
      expect(model.root().property('name').nodeType()).toBe('number');
      expect(model.isDirty()).toBe(true);
    });

    it('changes primitive to object', () => {
      const model = createSchemaModel(simpleSchema());
      const nameId = findNodeIdByName(model, 'name');

      const newNode = model.changeFieldType(nameId!, 'object');

      expect(newNode.isObject()).toBe(true);
      expect(newNode.properties()).toHaveLength(0);
    });

    it('changes primitive to array', () => {
      const model = createSchemaModel(simpleSchema());
      const nameId = findNodeIdByName(model, 'name');

      const newNode = model.changeFieldType(nameId!, 'array');

      expect(newNode.isArray()).toBe(true);
      expect(newNode.items().nodeType()).toBe('string');
    });

    it('returns null node for unknown id', () => {
      const model = createSchemaModel(simpleSchema());

      const result = model.changeFieldType('unknown-id', 'number');

      expect(result.isNull()).toBe(true);
    });

    it('tracks replacement for patch generation', () => {
      const model = createSchemaModel(simpleSchema());
      const nameId = findNodeIdByName(model, 'name');

      model.changeFieldType(nameId!, 'number');

      const patches = model.getPatches();
      expect(patches.length).toBeGreaterThan(0);
    });
  });

  describe('updateMetadata', () => {
    it('adds title to field', () => {
      const model = createSchemaModel(simpleSchema());
      const nameId = findNodeIdByName(model, 'name');

      model.updateMetadata(nameId!, { title: 'Full Name' });

      const meta = model.nodeById(nameId!).metadata();
      expect(meta.title).toBe('Full Name');
    });

    it('adds description to field', () => {
      const model = createSchemaModel(simpleSchema());
      const nameId = findNodeIdByName(model, 'name');

      model.updateMetadata(nameId!, { description: 'User name' });

      const meta = model.nodeById(nameId!).metadata();
      expect(meta.description).toBe('User name');
    });

    it('sets deprecated flag', () => {
      const model = createSchemaModel(simpleSchema());
      const nameId = findNodeIdByName(model, 'name');

      model.updateMetadata(nameId!, { deprecated: true });

      const meta = model.nodeById(nameId!).metadata();
      expect(meta.deprecated).toBe(true);
    });

    it('merges with existing metadata', () => {
      const model = createSchemaModel(schemaWithMetadata());
      const fieldId = findNodeIdByName(model, 'field');

      model.updateMetadata(fieldId!, { title: 'New Title' });

      const meta = model.nodeById(fieldId!).metadata();
      expect(meta.title).toBe('New Title');
      expect(meta.description).toBe('Field description');
    });

    it('ignores unknown id', () => {
      const model = createSchemaModel(simpleSchema());

      model.updateMetadata('unknown-id', { title: 'Test' });

      expect(model.isDirty()).toBe(false);
    });
  });

  describe('updateFormula', () => {
    it('adds formula to field', () => {
      const model = createSchemaModel(simpleSchema());
      const ageId = findNodeIdByName(model, 'age');

      model.updateFormula(ageId!, 'name');

      const formula = model.nodeById(ageId!).formula();
      expect(formula?.version()).toBe(1);
      expect(serializeAst(formula!.ast())).toBe('name');
    });

    it('updates existing formula', () => {
      const model = createSchemaModel(schemaWithFormula());
      const totalId = findNodeIdByName(model, 'total');

      model.updateFormula(totalId!, 'price * quantity * 1.1');

      const formula = model.nodeById(totalId!).formula();
      expect(serializeAst(formula!.ast())).toBe('price * quantity * 1.1');
    });

    it('removes formula when undefined', () => {
      const model = createSchemaModel(schemaWithFormula());
      const totalId = findNodeIdByName(model, 'total');

      model.updateFormula(totalId!, undefined);

      expect(model.nodeById(totalId!).hasFormula()).toBe(false);
    });

    it('ignores unknown id', () => {
      const model = createSchemaModel(simpleSchema());

      model.updateFormula('unknown-id', 'test');

      expect(model.isDirty()).toBe(false);
    });
  });

  describe('updateForeignKey', () => {
    it('adds foreign key to field', () => {
      const model = createSchemaModel(simpleSchema());
      const nameId = findNodeIdByName(model, 'name');

      model.updateForeignKey(nameId!, 'users');

      expect(model.nodeById(nameId!).foreignKey()).toBe('users');
    });

    it('updates existing foreign key', () => {
      const model = createSchemaModel(schemaWithForeignKey());
      const categoryId = findNodeIdByName(model, 'categoryId');

      model.updateForeignKey(categoryId!, 'tags');

      expect(model.nodeById(categoryId!).foreignKey()).toBe('tags');
    });

    it('removes foreign key when undefined', () => {
      const model = createSchemaModel(schemaWithForeignKey());
      const categoryId = findNodeIdByName(model, 'categoryId');

      model.updateForeignKey(categoryId!, undefined);

      expect(model.nodeById(categoryId!).foreignKey()).toBeUndefined();
    });

    it('ignores unknown id', () => {
      const model = createSchemaModel(simpleSchema());

      model.updateForeignKey('unknown-id', 'table');

      expect(model.isDirty()).toBe(false);
    });
  });

  describe('updateDefaultValue', () => {
    it('updates string default value', () => {
      const model = createSchemaModel(simpleSchema());
      const nameId = findNodeIdByName(model, 'name');

      model.updateDefaultValue(nameId!, 'John');

      expect(model.nodeById(nameId!).defaultValue()).toBe('John');
    });

    it('updates number default value', () => {
      const model = createSchemaModel(simpleSchema());
      const ageId = findNodeIdByName(model, 'age');

      model.updateDefaultValue(ageId!, 25);

      expect(model.nodeById(ageId!).defaultValue()).toBe(25);
    });

    it('ignores unknown id', () => {
      const model = createSchemaModel(simpleSchema());

      model.updateDefaultValue('unknown-id', 'test');

      expect(model.isDirty()).toBe(false);
    });
  });
});
