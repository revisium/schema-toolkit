import { describe, it, expect } from '@jest/globals';
import { createSchemaModel } from '../SchemaModelImpl.js';
import {
  emptySchema,
  simpleSchema,
  nestedSchema,
  arraySchema,
  schemaWithMetadata,
  schemaWithFormula,
  schemaWithForeignKey,
  findNodeIdByName,
} from './test-helpers.js';

describe('SchemaModel state management', () => {
  describe('markAsSaved', () => {
    it('clears dirty state after save', () => {
      const model = createSchemaModel(emptySchema());
      const rootId = model.root().id();

      model.addField(rootId, 'field', 'string');
      expect(model.isDirty()).toBe(true);

      model.markAsSaved();
      expect(model.isDirty()).toBe(false);
    });

    it('resets base tree - new changes tracked from saved state', () => {
      const model = createSchemaModel(emptySchema());
      const rootId = model.root().id();

      model.addField(rootId, 'field1', 'string');
      model.markAsSaved();

      model.addField(rootId, 'field2', 'number');

      expect(model.getPatches()).toMatchSnapshot();
    });

    it('allows multiple save cycles', () => {
      const model = createSchemaModel(emptySchema());
      const rootId = model.root().id();

      model.addField(rootId, 'field1', 'string');
      model.markAsSaved();

      model.addField(rootId, 'field2', 'number');
      model.markAsSaved();

      model.addField(rootId, 'field3', 'boolean');

      expect(model.getPatches()).toHaveLength(1);
      expect(model.root().properties()).toHaveLength(3);
    });
  });

  describe('revert', () => {
    it('restores original state', () => {
      const model = createSchemaModel(simpleSchema());
      const nameId = findNodeIdByName(model, 'name');

      model.removeField(nameId!);
      expect(model.root().properties()).toHaveLength(1);

      model.revert();
      expect(model.root().properties()).toHaveLength(2);
      expect(model.root().property('name').isNull()).toBe(false);
    });

    it('clears dirty state', () => {
      const model = createSchemaModel(emptySchema());
      const rootId = model.root().id();

      model.addField(rootId, 'field', 'string');
      model.revert();

      expect(model.isDirty()).toBe(false);
    });

    it('reverts to last saved state', () => {
      const model = createSchemaModel(emptySchema());
      const rootId = model.root().id();

      model.addField(rootId, 'field1', 'string');
      model.markAsSaved();

      model.addField(rootId, 'field2', 'number');
      model.revert();

      expect(model.root().properties()).toHaveLength(1);
      expect(model.root().property('field1').isNull()).toBe(false);
      expect(model.root().property('field2').isNull()).toBe(true);
    });

    it('reverts multiple changes', () => {
      const model = createSchemaModel(simpleSchema());
      const nameId = findNodeIdByName(model, 'name');
      const ageId = findNodeIdByName(model, 'age');

      model.removeField(nameId!);
      model.renameField(ageId!, 'years');

      model.revert();

      expect(model.root().property('name').isNull()).toBe(false);
      expect(model.root().property('age').isNull()).toBe(false);
      expect(model.root().property('years').isNull()).toBe(true);
    });
  });

  describe('isValid', () => {
    it('returns true for valid schema', () => {
      const model = createSchemaModel(simpleSchema());

      expect(model.isValid()).toBe(true);
    });

    it('returns true for empty schema', () => {
      const model = createSchemaModel(emptySchema());

      expect(model.isValid()).toBe(true);
    });
  });

  describe('getPlainSchema', () => {
    it('serializes empty schema', () => {
      const model = createSchemaModel(emptySchema());

      expect(model.getPlainSchema()).toMatchSnapshot();
    });

    it('serializes simple schema', () => {
      const model = createSchemaModel(simpleSchema());

      expect(model.getPlainSchema()).toMatchSnapshot();
    });

    it('serializes nested schema', () => {
      const model = createSchemaModel(nestedSchema());

      expect(model.getPlainSchema()).toMatchSnapshot();
    });

    it('serializes metadata', () => {
      const model = createSchemaModel(schemaWithMetadata());

      expect(model.getPlainSchema()).toMatchSnapshot();
    });

    it('serializes formula', () => {
      const model = createSchemaModel(schemaWithFormula());

      expect(model.getPlainSchema()).toMatchSnapshot();
    });

    it('serializes foreign key', () => {
      const model = createSchemaModel(schemaWithForeignKey());

      expect(model.getPlainSchema()).toMatchSnapshot();
    });

    it('reflects changes before save', () => {
      const model = createSchemaModel(emptySchema());
      const rootId = model.root().id();

      model.addField(rootId, 'newField', 'string');

      expect(model.getPlainSchema()).toMatchSnapshot();
    });
  });

  describe('generateDefaultValue', () => {
    it('returns defaults for current schema', () => {
      const model = createSchemaModel(simpleSchema());

      const result = model.generateDefaultValue();

      expect(result).toEqual({ name: '', age: 0 });
    });

    it('applies arrayItemCount option', () => {
      const model = createSchemaModel(arraySchema());

      const result = model.generateDefaultValue({ arrayItemCount: 2 });

      expect(result).toEqual({ items: ['', ''] });
    });

    it('reflects schema changes', () => {
      const model = createSchemaModel(emptySchema());
      const rootId = model.root().id();

      model.addField(rootId, 'name', 'string');
      model.addField(rootId, 'active', 'boolean');

      const result = model.generateDefaultValue();

      expect(result).toEqual({ name: '', active: false });
    });

    it('returns defaults for nested schema', () => {
      const model = createSchemaModel(nestedSchema());

      const result = model.generateDefaultValue();

      expect(result).toEqual({
        user: { firstName: '', lastName: '' },
      });
    });
  });
});
