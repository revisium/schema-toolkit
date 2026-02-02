import { describe, it, expect } from '@jest/globals';
import { createSchemaModel } from '../SchemaModelImpl.js';
import {
  emptySchema,
  simpleSchema,
  findNodeIdByName,
} from './test-helpers.js';

describe('SchemaModel patches', () => {
  describe('getPatches', () => {
    it('returns empty array when no changes', () => {
      const model = createSchemaModel(simpleSchema());

      expect(model.getPatches()).toMatchSnapshot();
    });

    it('returns add patch for new field', () => {
      const model = createSchemaModel(emptySchema());
      const rootId = model.root().id();

      model.addField(rootId, 'newField', 'string');

      expect(model.getPatches()).toMatchSnapshot();
    });

    it('returns remove patch for deleted field', () => {
      const model = createSchemaModel(simpleSchema());
      const nameId = findNodeIdByName(model, 'name');

      model.removeField(nameId!);

      expect(model.getPatches()).toMatchSnapshot();
    });

    it('returns move patch for renamed field', () => {
      const model = createSchemaModel(simpleSchema());
      const nameId = findNodeIdByName(model, 'name');

      model.renameField(nameId!, 'fullName');

      expect(model.getPatches()).toMatchSnapshot();
    });

    it('returns replace patch for type change', () => {
      const model = createSchemaModel(simpleSchema());
      const nameId = findNodeIdByName(model, 'name');

      model.changeFieldType(nameId!, 'number');

      expect(model.getPatches()).toMatchSnapshot();
    });

    it('returns replace patch for default value change', () => {
      const model = createSchemaModel(simpleSchema());
      const nameId = findNodeIdByName(model, 'name');

      model.updateDefaultValue(nameId!, 'changed');

      expect(model.getPatches()).toMatchSnapshot();
    });

    it('includes formula change info', () => {
      const model = createSchemaModel(simpleSchema());
      const ageId = findNodeIdByName(model, 'age');

      model.updateFormula(ageId!, 'x + 1');

      expect(model.getPatches()).toMatchSnapshot();
    });

    it('multiple field additions', () => {
      const model = createSchemaModel(emptySchema());
      const rootId = model.root().id();

      model.addField(rootId, 'field1', 'string');
      model.addField(rootId, 'field2', 'number');
      model.addField(rootId, 'field3', 'boolean');

      expect(model.getPatches()).toMatchSnapshot();
    });
  });

  describe('getJsonPatches', () => {
    it('returns plain JSON patches', () => {
      const model = createSchemaModel(emptySchema());
      const rootId = model.root().id();

      model.addField(rootId, 'field', 'string');

      expect(model.getJsonPatches()).toMatchSnapshot();
    });
  });

  describe('isDirty', () => {
    it('returns false initially', () => {
      const model = createSchemaModel(simpleSchema());

      expect(model.isDirty()).toBe(false);
    });

    it('returns true after adding field', () => {
      const model = createSchemaModel(emptySchema());
      const rootId = model.root().id();

      model.addField(rootId, 'field', 'string');

      expect(model.isDirty()).toBe(true);
    });

    it('returns false after markAsSaved', () => {
      const model = createSchemaModel(emptySchema());
      const rootId = model.root().id();

      model.addField(rootId, 'field', 'string');
      model.markAsSaved();

      expect(model.isDirty()).toBe(false);
    });

    it('returns false after revert', () => {
      const model = createSchemaModel(emptySchema());
      const rootId = model.root().id();

      model.addField(rootId, 'field', 'string');
      model.revert();

      expect(model.isDirty()).toBe(false);
    });
  });
});
