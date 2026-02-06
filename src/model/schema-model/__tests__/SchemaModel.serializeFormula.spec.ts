import { describe, it, expect } from '@jest/globals';
import { autorun } from 'mobx';
import { createSchemaModel } from '../SchemaModelImpl.js';
import { obj, num, str } from '../../../mocks/schema.mocks.js';
import { findNodeIdByName, findNestedNodeId } from './test-helpers.js';

describe('SchemaModel serializeFormula', () => {
  const schemaWithFormulaInNested = () =>
    obj({
      value: num(),
      nested: obj({
        sum: num({ readOnly: true, formula: '../value + 2' }),
      }),
    });

  describe('serializeFormula', () => {
    it('returns empty string for node without formula', () => {
      const schema = obj({ field: str() });
      const model = createSchemaModel(schema);
      const fieldId = findNodeIdByName(model, 'field');

      expect(model.serializeFormula(fieldId!)).toBe('');
    });

    it('returns serialized formula for node with formula', () => {
      const schema = obj({
        price: num(),
        total: num({ readOnly: true, formula: 'price * 2' }),
      });
      const model = createSchemaModel(schema);
      const totalId = findNodeIdByName(model, 'total');

      expect(model.serializeFormula(totalId!)).toBe('price * 2');
    });

    it('updates relative path when node is moved', () => {
      const schema = obj({
        value: num(),
        sum: num({ readOnly: true, formula: 'value + 2' }),
        target: obj({}),
      });
      const model = createSchemaModel(schema);
      const sumId = findNodeIdByName(model, 'sum');
      const targetId = findNodeIdByName(model, 'target');

      expect(model.serializeFormula(sumId!)).toBe('value + 2');

      model.moveNode(sumId!, targetId!);

      expect(model.serializeFormula(sumId!)).toBe('../value + 2');
    });

    it('serializes nested formula with relative path', () => {
      const model = createSchemaModel(schemaWithFormulaInNested());
      const sumId = findNestedNodeId(model, 'nested', 'sum');

      expect(model.serializeFormula(sumId!)).toBe('../value + 2');
    });

    it('updates path when formula node moved to root', () => {
      const model = createSchemaModel(schemaWithFormulaInNested());
      const sumId = findNestedNodeId(model, 'nested', 'sum');
      const rootId = model.root.id();

      expect(model.serializeFormula(sumId!)).toBe('../value + 2');

      model.moveNode(sumId!, rootId);

      expect(model.serializeFormula(sumId!)).toBe('value + 2');
    });

    it('returns empty string for non-existent node', () => {
      const schema = obj({});
      const model = createSchemaModel(schema);

      expect(model.serializeFormula('non-existent')).toBe('');
    });

    it('returns empty string when formula serialization fails after rename to empty', () => {
      const schema = obj({
        price: num(),
        quantity: num(),
        total: num({ readOnly: true, formula: 'price * quantity' }),
      });
      const model = createSchemaModel(schema);
      const priceId = findNodeIdByName(model, 'price');
      const totalId = findNodeIdByName(model, 'total');

      model.renameField(priceId!, '');

      expect(model.serializeFormula(totalId!)).toBe('');
    });

    it('returns empty string when formula serialization fails after rename to invalid identifier', () => {
      const schema = obj({
        price: num(),
        quantity: num(),
        total: num({ readOnly: true, formula: 'price * quantity' }),
      });
      const model = createSchemaModel(schema);
      const priceId = findNodeIdByName(model, 'price');
      const totalId = findNodeIdByName(model, 'total');

      model.renameField(priceId!, '2price');

      expect(model.serializeFormula(totalId!)).toBe('');
    });
  });

  describe('serializeFormula reactivity', () => {
    it('autorun reacts to moveNode', () => {
      const schema = obj({
        value: num(),
        sum: num({ readOnly: true, formula: 'value + 2' }),
        target: obj({}),
      });
      const model = createSchemaModel(schema);
      const sumId = findNodeIdByName(model, 'sum');
      const targetId = findNodeIdByName(model, 'target');

      let observedFormula = '';
      const dispose = autorun(() => {
        observedFormula = model.serializeFormula(sumId!);
      });

      expect(observedFormula).toBe('value + 2');

      model.moveNode(sumId!, targetId!);

      expect(observedFormula).toBe('../value + 2');

      dispose();
    });
  });
});
