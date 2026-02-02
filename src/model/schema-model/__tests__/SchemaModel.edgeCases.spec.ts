import { describe, it, expect } from '@jest/globals';
import { createSchemaModel } from '../SchemaModelImpl.js';
import {
  emptySchema,
  simpleSchema,
  nestedSchema,
  arraySchema,
  findNodeIdByName,
  findNestedNodeId,
} from './test-helpers.js';

describe('SchemaModel edge cases', () => {
  describe('complex operations', () => {
    it('handles add then remove same field', () => {
      const model = createSchemaModel(emptySchema());
      const rootId = model.root().id();

      const node = model.addField(rootId, 'temp', 'string');
      model.removeField(node.id());

      expect(model.root().properties()).toHaveLength(0);
      expect(model.isDirty()).toBe(false);
    });

    it('handles remove then add same name', () => {
      const model = createSchemaModel(simpleSchema());
      const nameId = findNodeIdByName(model, 'name');
      const rootId = model.root().id();

      model.removeField(nameId!);
      model.addField(rootId, 'name', 'number');

      expect(model.root().property('name').nodeType()).toBe('number');
      expect(model.getPatches()).toMatchSnapshot();
    });

    it('handles multiple renames', () => {
      const model = createSchemaModel(simpleSchema());
      const nameId = findNodeIdByName(model, 'name');

      model.renameField(nameId!, 'firstName');
      model.renameField(nameId!, 'givenName');

      expect(model.root().property('givenName').isNull()).toBe(false);
      expect(model.root().property('firstName').isNull()).toBe(true);
      expect(model.root().property('name').isNull()).toBe(true);
      expect(model.getPatches()).toMatchSnapshot();
    });

    it('handles type change then modification', () => {
      const model = createSchemaModel(simpleSchema());
      const nameId = findNodeIdByName(model, 'name');

      const newNode = model.changeFieldType(nameId!, 'number');
      model.updateDefaultValue(newNode.id(), 42);

      expect(model.root().property('name').defaultValue()).toBe(42);
      expect(model.getPatches()).toMatchSnapshot();
    });
  });

  describe('nested operations', () => {
    it('adds field to nested object', () => {
      const model = createSchemaModel(nestedSchema());
      const user = model.root().property('user');

      model.addField(user.id(), 'age', 'number');

      expect(user.properties()).toHaveLength(3);
      expect(model.getPatches()).toMatchSnapshot();
    });

    it('removes nested object with children', () => {
      const model = createSchemaModel(nestedSchema());
      const userId = model.root().property('user').id();

      model.removeField(userId);

      expect(model.root().properties()).toHaveLength(0);
      expect(model.getPatches()).toMatchSnapshot();
    });

    it('renames nested field', () => {
      const model = createSchemaModel(nestedSchema());
      const firstNameId = findNestedNodeId(model, 'user', 'firstName');

      model.renameField(firstNameId!, 'givenName');

      const user = model.root().property('user');
      expect(user.property('givenName').isNull()).toBe(false);
      expect(user.property('firstName').isNull()).toBe(true);
      expect(model.getPatches()).toMatchSnapshot();
    });
  });

  describe('array operations', () => {
    it('modifies array items type', () => {
      const model = createSchemaModel(arraySchema());
      const items = model.root().property('items').items();

      const newItems = model.changeFieldType(items.id(), 'number');

      expect(model.root().property('items').items().nodeType()).toBe('number');
      expect(newItems.nodeType()).toBe('number');
      expect(model.getPatches()).toMatchSnapshot();
    });

    it('changes array to object', () => {
      const model = createSchemaModel(arraySchema());
      const itemsId = model.root().property('items').id();

      model.changeFieldType(itemsId, 'object');

      expect(model.root().property('items').isObject()).toBe(true);
      expect(model.getPatches()).toMatchSnapshot();
    });
  });

  describe('multiple changes before save', () => {
    it('accumulates all changes', () => {
      const model = createSchemaModel(simpleSchema());
      const rootId = model.root().id();

      model.addField(rootId, 'field1', 'string');
      model.addField(rootId, 'field2', 'number');
      model.addField(rootId, 'field3', 'boolean');

      expect(model.getPatches()).toMatchSnapshot();
    });

    it('correctly handles remove after multiple adds', () => {
      const model = createSchemaModel(emptySchema());
      const rootId = model.root().id();

      const field1 = model.addField(rootId, 'field1', 'string');
      model.addField(rootId, 'field2', 'number');
      model.removeField(field1.id());

      expect(model.getPatches()).toMatchSnapshot();
    });
  });

  describe('save and continue editing', () => {
    it('tracks new changes after save', () => {
      const model = createSchemaModel(emptySchema());
      const rootId = model.root().id();

      model.addField(rootId, 'saved', 'string');
      model.markAsSaved();

      model.addField(rootId, 'new', 'number');

      expect(model.getPatches()).toMatchSnapshot();
    });

    it('can modify saved fields', () => {
      const model = createSchemaModel(emptySchema());
      const rootId = model.root().id();

      const field = model.addField(rootId, 'field', 'string');
      model.markAsSaved();

      model.updateDefaultValue(field.id(), 'changed');

      expect(model.isDirty()).toBe(true);
      expect(model.getPatches()).toMatchSnapshot();
    });
  });

  describe('revert scenarios', () => {
    it('allows editing after revert', () => {
      const model = createSchemaModel(emptySchema());
      const rootId = model.root().id();

      model.addField(rootId, 'field', 'string');
      model.revert();

      model.addField(rootId, 'newField', 'number');

      expect(model.isDirty()).toBe(true);
      expect(model.root().property('newField').isNull()).toBe(false);
    });

    it('partial revert scenario - save then change then revert', () => {
      const model = createSchemaModel(emptySchema());
      const rootId = model.root().id();

      model.addField(rootId, 'field1', 'string');
      model.markAsSaved();

      model.addField(rootId, 'field2', 'number');
      model.revert();

      expect(model.root().properties()).toHaveLength(1);
      expect(model.root().property('field1').isNull()).toBe(false);
    });
  });
});
