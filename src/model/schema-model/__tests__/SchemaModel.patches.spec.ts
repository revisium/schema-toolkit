import { describe, it, expect } from '@jest/globals';
import { createSchemaModel } from '../SchemaModelImpl.js';
import {
  emptySchema,
  simpleSchema,
  schemaWithFormula,
  findNodeIdByName,
} from './test-helpers.js';

describe('SchemaModel patches', () => {
  describe('getPatches', () => {
    it('returns empty array when no changes', () => {
      const model = createSchemaModel(simpleSchema());

      expect(model.patches).toMatchSnapshot();
    });

    it('returns add patch for new field', () => {
      const model = createSchemaModel(emptySchema());
      const rootId = model.root.id();

      model.addField(rootId, 'newField', 'string');

      expect(model.patches).toMatchSnapshot();
    });

    it('returns remove patch for deleted field', () => {
      const model = createSchemaModel(simpleSchema());
      const nameId = findNodeIdByName(model, 'name');

      model.removeField(nameId!);

      expect(model.patches).toMatchSnapshot();
    });

    it('returns move patch for renamed field', () => {
      const model = createSchemaModel(simpleSchema());
      const nameId = findNodeIdByName(model, 'name');

      model.renameField(nameId!, 'fullName');

      expect(model.patches).toMatchSnapshot();
    });

    it('returns replace patch for type change', () => {
      const model = createSchemaModel(simpleSchema());
      const nameId = findNodeIdByName(model, 'name');

      model.changeFieldType(nameId!, 'number');

      expect(model.patches).toMatchSnapshot();
    });

    it('returns replace patch for default value change', () => {
      const model = createSchemaModel(simpleSchema());
      const nameId = findNodeIdByName(model, 'name');

      model.updateDefaultValue(nameId!, 'changed');

      expect(model.patches).toMatchSnapshot();
    });

    it('includes formula change info', () => {
      const model = createSchemaModel(simpleSchema());
      const ageId = findNodeIdByName(model, 'age');

      model.updateFormula(ageId!, 'name');

      expect(model.patches).toMatchSnapshot();
    });

    it('multiple field additions', () => {
      const model = createSchemaModel(emptySchema());
      const rootId = model.root.id();

      model.addField(rootId, 'field1', 'string');
      model.addField(rootId, 'field2', 'number');
      model.addField(rootId, 'field3', 'boolean');

      expect(model.patches).toMatchSnapshot();
    });

    it('auto-updates formula serialization when dependency is renamed', () => {
      const model = createSchemaModel(schemaWithFormula());
      const priceId = findNodeIdByName(model, 'price');
      const totalId = findNodeIdByName(model, 'total');

      model.renameField(priceId!, 'cost');

      const patches = model.patches;
      expect(patches).toHaveLength(2);

      const movePatches = patches.filter((p) => p.patch.op === 'move');
      expect(movePatches).toHaveLength(1);
      expect(movePatches[0]?.patch).toMatchObject({
        op: 'move',
        from: '/properties/price',
        path: '/properties/cost',
      });

      const replacePatches = patches.filter((p) => p.patch.op === 'replace');
      expect(replacePatches).toHaveLength(1);
      const formulaPatch = replacePatches[0];
      expect(formulaPatch?.fieldName).toBe('total');
      expect(formulaPatch?.formulaChange).toMatchObject({
        fromFormula: 'price * quantity',
        toFormula: 'cost * quantity',
      });

      const totalNode = model.nodeById(totalId!);
      const formula = totalNode.formula();
      expect(formula).toBeDefined();
      expect(formula?.expression()).toBe('price * quantity');
    });
  });

  describe('getJsonPatches', () => {
    it('returns plain JSON patches', () => {
      const model = createSchemaModel(emptySchema());
      const rootId = model.root.id();

      model.addField(rootId, 'field', 'string');

      expect(model.jsonPatches).toMatchSnapshot();
    });
  });

  describe('isDirty', () => {
    it('returns false initially', () => {
      const model = createSchemaModel(simpleSchema());

      expect(model.isDirty).toBe(false);
    });

    it('returns true after adding field', () => {
      const model = createSchemaModel(emptySchema());
      const rootId = model.root.id();

      model.addField(rootId, 'field', 'string');

      expect(model.isDirty).toBe(true);
    });

    it('returns false after markAsSaved', () => {
      const model = createSchemaModel(emptySchema());
      const rootId = model.root.id();

      model.addField(rootId, 'field', 'string');
      model.markAsSaved();

      expect(model.isDirty).toBe(false);
    });

    it('returns false after revert', () => {
      const model = createSchemaModel(emptySchema());
      const rootId = model.root.id();

      model.addField(rootId, 'field', 'string');
      model.revert();

      expect(model.isDirty).toBe(false);
    });
  });
});
