import { describe, it, expect } from '@jest/globals';
import { createSchemaModel } from '../SchemaModelImpl.js';
import { schemaWithFormula, simpleSchema, findNodeIdByName } from './test-helpers.js';

describe('SchemaModel formula dependents', () => {
  describe('getFormulaDependents', () => {
    it('returns dependents for field referenced in formula', () => {
      const model = createSchemaModel(schemaWithFormula());
      const priceId = findNodeIdByName(model, 'price');
      const totalId = findNodeIdByName(model, 'total');

      const dependents = model.getFormulaDependents(priceId!);

      expect(dependents).toContain(totalId);
    });

    it('returns dependents for all referenced fields', () => {
      const model = createSchemaModel(schemaWithFormula());
      const priceId = findNodeIdByName(model, 'price');
      const quantityId = findNodeIdByName(model, 'quantity');
      const totalId = findNodeIdByName(model, 'total');

      expect(model.getFormulaDependents(priceId!)).toContain(totalId);
      expect(model.getFormulaDependents(quantityId!)).toContain(totalId);
    });

    it('returns empty array for field with no dependents', () => {
      const model = createSchemaModel(schemaWithFormula());
      const totalId = findNodeIdByName(model, 'total');

      const dependents = model.getFormulaDependents(totalId!);

      expect(dependents).toHaveLength(0);
    });

    it('returns empty array for non-existent node', () => {
      const model = createSchemaModel(schemaWithFormula());

      const dependents = model.getFormulaDependents('non-existent');

      expect(dependents).toHaveLength(0);
    });

    it('returns empty array when no formulas exist', () => {
      const model = createSchemaModel(simpleSchema());
      const nameId = findNodeIdByName(model, 'name');

      const dependents = model.getFormulaDependents(nameId!);

      expect(dependents).toHaveLength(0);
    });

    it('updates when formula is added', () => {
      const model = createSchemaModel(simpleSchema());
      const nameId = findNodeIdByName(model, 'name');
      const ageId = findNodeIdByName(model, 'age');

      expect(model.getFormulaDependents(nameId!)).toHaveLength(0);

      model.updateFormula(ageId!, 'name');

      expect(model.getFormulaDependents(nameId!)).toContain(ageId);
    });

    it('updates when formula is removed', () => {
      const model = createSchemaModel(schemaWithFormula());
      const priceId = findNodeIdByName(model, 'price');
      const totalId = findNodeIdByName(model, 'total');

      expect(model.getFormulaDependents(priceId!)).toContain(totalId);

      model.updateFormula(totalId!, undefined);

      expect(model.getFormulaDependents(priceId!)).toHaveLength(0);
    });
  });

  describe('hasFormulaDependents', () => {
    it('returns true when field has dependents', () => {
      const model = createSchemaModel(schemaWithFormula());
      const priceId = findNodeIdByName(model, 'price');

      expect(model.hasFormulaDependents(priceId!)).toBe(true);
    });

    it('returns false when field has no dependents', () => {
      const model = createSchemaModel(schemaWithFormula());
      const totalId = findNodeIdByName(model, 'total');

      expect(model.hasFormulaDependents(totalId!)).toBe(false);
    });

    it('returns false for non-existent node', () => {
      const model = createSchemaModel(schemaWithFormula());

      expect(model.hasFormulaDependents('non-existent')).toBe(false);
    });

    it('returns false when no formulas exist', () => {
      const model = createSchemaModel(simpleSchema());
      const nameId = findNodeIdByName(model, 'name');

      expect(model.hasFormulaDependents(nameId!)).toBe(false);
    });

    it('updates when formula is added', () => {
      const model = createSchemaModel(simpleSchema());
      const nameId = findNodeIdByName(model, 'name');
      const ageId = findNodeIdByName(model, 'age');

      expect(model.hasFormulaDependents(nameId!)).toBe(false);

      model.updateFormula(ageId!, 'name');

      expect(model.hasFormulaDependents(nameId!)).toBe(true);
    });

    it('updates when formula is removed', () => {
      const model = createSchemaModel(schemaWithFormula());
      const priceId = findNodeIdByName(model, 'price');
      const totalId = findNodeIdByName(model, 'total');

      expect(model.hasFormulaDependents(priceId!)).toBe(true);

      model.updateFormula(totalId!, undefined);

      expect(model.hasFormulaDependents(priceId!)).toBe(false);
    });
  });
});
