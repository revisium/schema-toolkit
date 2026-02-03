import { describe, it, expect } from '@jest/globals';
import { createSchemaModel } from '../SchemaModelImpl.js';
import {
  emptySchema,
  simpleSchema,
  schemaWithFormula,
  findNodeIdByName,
} from './test-helpers.js';

describe('SchemaModel validation', () => {
  describe('getValidationErrors', () => {
    it('returns empty array for valid schema', () => {
      const model = createSchemaModel(simpleSchema());

      const errors = model.validationErrors;

      expect(errors).toHaveLength(0);
    });

    it('detects empty field name after adding field with empty name', () => {
      const model = createSchemaModel(emptySchema());
      const rootId = model.root.id();
      const node = model.addField(rootId, '', 'string');

      const errors = model.validationErrors;

      expect(errors).toHaveLength(1);
      expect(errors[0]).toMatchObject({
        nodeId: node.id(),
        type: 'empty-name',
      });
    });

    it('detects invalid field name', () => {
      const model = createSchemaModel(emptySchema());
      const rootId = model.root.id();
      const node = model.addField(rootId, '123invalid', 'string');

      const errors = model.validationErrors;

      expect(errors).toHaveLength(1);
      expect(errors[0]).toMatchObject({
        nodeId: node.id(),
        type: 'invalid-name',
      });
    });

    it('detects reserved name starting with __', () => {
      const model = createSchemaModel(emptySchema());
      const rootId = model.root.id();
      const node = model.addField(rootId, '__reserved', 'string');

      const errors = model.validationErrors;

      expect(errors).toHaveLength(1);
      expect(errors[0]).toMatchObject({
        nodeId: node.id(),
        type: 'invalid-name',
      });
    });

    it('detects duplicate field names', () => {
      const model = createSchemaModel(emptySchema());
      const rootId = model.root.id();
      model.addField(rootId, 'field', 'string');
      const duplicate = model.addField(rootId, 'field', 'string');

      const errors = model.validationErrors;

      expect(errors).toHaveLength(1);
      expect(errors[0]).toMatchObject({
        nodeId: duplicate.id(),
        type: 'duplicate-name',
      });
    });
  });

  describe('getFormulaErrors', () => {
    it('returns empty array when no formulas exist', () => {
      const model = createSchemaModel(simpleSchema());

      const errors = model.formulaErrors;

      expect(errors).toHaveLength(0);
    });

    it('returns empty array for valid formulas', () => {
      const model = createSchemaModel(schemaWithFormula());

      const errors = model.formulaErrors;

      expect(errors).toHaveLength(0);
    });

    it('detects missing formula dependency after field removal', () => {
      const model = createSchemaModel(schemaWithFormula());
      const priceId = findNodeIdByName(model, 'price');

      model.removeField(priceId!);

      const errors = model.formulaErrors;

      expect(errors).toHaveLength(1);
      expect(errors[0]).toMatchObject({
        nodeId: findNodeIdByName(model, 'total'),
        message: 'Cannot resolve formula dependency: target node not found',
      });
    });
  });

  describe('isValid', () => {
    it('returns true for valid schema', () => {
      const model = createSchemaModel(simpleSchema());

      expect(model.isValid).toBe(true);
    });

    it('returns false when schema has validation errors', () => {
      const model = createSchemaModel(emptySchema());
      const rootId = model.root.id();
      model.addField(rootId, '', 'string');

      expect(model.isValid).toBe(false);
    });

    it('returns false when schema has formula errors', () => {
      const model = createSchemaModel(schemaWithFormula());
      const priceId = findNodeIdByName(model, 'price');

      model.removeField(priceId!);

      expect(model.isValid).toBe(false);
    });

    it('returns false when root is not object', () => {
      const model = createSchemaModel(simpleSchema());

      model.replaceRoot('array');

      expect(model.isValid).toBe(false);
    });
  });
});
