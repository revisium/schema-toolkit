import { describe, it, expect } from '@jest/globals';
import { createSchemaModel } from '../SchemaModelImpl.js';
import { obj, num } from '../../../mocks/schema.mocks.js';
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

    it('captures formula parse error for invalid dependency at init time', () => {
      const schema = obj({
        value: num(),
        computed: num({ readOnly: true, formula: 'unknownField * 2' }),
      });

      const model = createSchemaModel(schema);

      expect(model.formulaErrors).toHaveLength(1);
      expect(model.formulaErrors[0]?.message).toContain('unknownField');
    });

    it('valid formulas still work when another formula has parse error', () => {
      const schema = obj({
        value: num({ default: 10 }),
        validComputed: num({ readOnly: true, formula: 'value * 2' }),
        invalidComputed: num({ readOnly: true, formula: 'missingField + 1' }),
      });

      const model = createSchemaModel(schema);

      expect(model.formulaErrors).toHaveLength(1);
      expect(model.formulaErrors[0]?.message).toContain('missingField');

      const validComputedNode = model.root.property('validComputed');
      expect(validComputedNode.hasFormula()).toBe(true);
    });

    it('captures syntax error in formula expression', () => {
      const schema = obj({
        computed: num({ readOnly: true, formula: '+ + invalid syntax' }),
      });

      const model = createSchemaModel(schema);

      expect(model.formulaErrors).toHaveLength(1);
    });

    it('clears parse error when formula is updated', () => {
      const schema = obj({
        value: num(),
        computed: num({ readOnly: true, formula: 'unknownField * 2' }),
      });

      const model = createSchemaModel(schema);
      expect(model.formulaErrors).toHaveLength(1);

      const computedId = findNodeIdByName(model, 'computed');
      model.updateFormula(computedId!, 'value * 2');

      expect(model.formulaErrors).toHaveLength(0);
      expect(model.isValid).toBe(true);
    });

    it('captures parse error when updateFormula sets invalid formula', () => {
      const model = createSchemaModel(simpleSchema());
      const ageId = findNodeIdByName(model, 'age');

      model.updateFormula(ageId!, 'nonExistentField + 1');

      expect(model.formulaErrors).toHaveLength(1);
      expect(model.formulaErrors[0]?.message).toContain('nonExistentField');
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

    it('returns true when root is not object', () => {
      const model = createSchemaModel(simpleSchema());

      model.replaceRoot('array');

      expect(model.isValid).toBe(true);
    });
  });
});
