import { describe, it, expect } from '@jest/globals';
import { serializeAst } from '@revisium/formula';
import { createSchemaModel } from '../SchemaModelImpl.js';
import {
  emptySchema,
  simpleSchema,
  nestedSchema,
  arraySchema,
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
      expect(model.root.property('name').nodeType()).toBe('number');
      expect(model.isDirty).toBe(true);
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

      const patches = model.patches;
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

      expect(model.isDirty).toBe(false);
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

      expect(model.isDirty).toBe(false);
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

      expect(model.isDirty).toBe(false);
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

      expect(model.isDirty).toBe(false);
    });
  });

  describe('insertFieldAt', () => {
    it('inserts at beginning', () => {
      const model = createSchemaModel(simpleSchema());
      const rootId = model.root.id();

      const node = model.insertFieldAt(rootId, 0, 'email', 'string');

      expect(node.isNull()).toBe(false);
      expect(node.name()).toBe('email');
      expect(node.nodeType()).toBe('string');
      expect(model.root.properties()).toHaveLength(3);
      expect(model.root.properties()[0]?.name()).toBe('email');
      expect(model.root.properties()[1]?.name()).toBe('age');
      expect(model.root.properties()[2]?.name()).toBe('name');
    });

    it('inserts in middle', () => {
      const model = createSchemaModel(simpleSchema());
      const rootId = model.root.id();

      model.insertFieldAt(rootId, 1, 'email', 'string');

      expect(model.root.properties()).toHaveLength(3);
      expect(model.root.properties()[0]?.name()).toBe('age');
      expect(model.root.properties()[1]?.name()).toBe('email');
      expect(model.root.properties()[2]?.name()).toBe('name');
    });

    it('inserts at end behaves like addField', () => {
      const model = createSchemaModel(simpleSchema());
      const rootId = model.root.id();

      model.insertFieldAt(rootId, 2, 'email', 'string');

      expect(model.root.properties()).toHaveLength(3);
      expect(model.root.properties()[0]?.name()).toBe('age');
      expect(model.root.properties()[1]?.name()).toBe('name');
      expect(model.root.properties()[2]?.name()).toBe('email');
    });

    it('inserts into nested object', () => {
      const model = createSchemaModel(nestedSchema());
      const userId = model.root.property('user').id();

      model.insertFieldAt(userId, 0, 'email', 'string');

      const user = model.root.property('user');
      expect(user.properties()).toHaveLength(3);
      expect(user.properties()[0]?.name()).toBe('email');
      expect(user.properties()[1]?.name()).toBe('firstName');
      expect(user.properties()[2]?.name()).toBe('lastName');
    });

    it('returns null node for non-object parent', () => {
      const model = createSchemaModel(arraySchema());
      const itemsId = model.root.property('items').id();

      const result = model.insertFieldAt(itemsId, 0, 'field', 'string');

      expect(result.isNull()).toBe(true);
    });

    it('returns null node for unknown parent', () => {
      const model = createSchemaModel(simpleSchema());

      const result = model.insertFieldAt('unknown-id', 0, 'field', 'string');

      expect(result.isNull()).toBe(true);
    });

    it('sets isDirty to true', () => {
      const model = createSchemaModel(emptySchema());
      const rootId = model.root.id();

      expect(model.isDirty).toBe(false);

      model.insertFieldAt(rootId, 0, 'field', 'string');

      expect(model.isDirty).toBe(true);
    });

    it('generates patches', () => {
      const model = createSchemaModel(simpleSchema());
      const rootId = model.root.id();

      model.insertFieldAt(rootId, 0, 'email', 'string');

      expect(model.patches).toMatchSnapshot();
    });

    it('maintains order with multiple inserts', () => {
      const model = createSchemaModel(emptySchema());
      const rootId = model.root.id();

      model.insertFieldAt(rootId, 0, 'first', 'string');
      model.insertFieldAt(rootId, 0, 'zeroth', 'number');
      model.insertFieldAt(rootId, 2, 'second', 'boolean');
      model.insertFieldAt(rootId, 1, 'between', 'string');

      expect(model.root.properties()).toHaveLength(4);
      expect(model.root.properties()[0]?.name()).toBe('zeroth');
      expect(model.root.properties()[1]?.name()).toBe('between');
      expect(model.root.properties()[2]?.name()).toBe('first');
      expect(model.root.properties()[3]?.name()).toBe('second');
    });

    it('returns null node for negative index', () => {
      const model = createSchemaModel(simpleSchema());
      const rootId = model.root.id();

      const result = model.insertFieldAt(rootId, -1, 'field', 'string');

      expect(result.isNull()).toBe(true);
      expect(model.root.properties()).toHaveLength(2);
    });

    it('returns null node for index beyond length', () => {
      const model = createSchemaModel(simpleSchema());
      const rootId = model.root.id();

      const result = model.insertFieldAt(rootId, 10, 'field', 'string');

      expect(result.isNull()).toBe(true);
      expect(model.root.properties()).toHaveLength(2);
    });

    it('supports all field types', () => {
      const model = createSchemaModel(emptySchema());
      const rootId = model.root.id();

      model.insertFieldAt(rootId, 0, 'obj', 'object');
      model.insertFieldAt(rootId, 1, 'arr', 'array');
      model.insertFieldAt(rootId, 2, 'bool', 'boolean');

      expect(model.root.properties()[0]?.isObject()).toBe(true);
      expect(model.root.properties()[1]?.isArray()).toBe(true);
      expect(model.root.properties()[2]?.nodeType()).toBe('boolean');
    });
  });
});
