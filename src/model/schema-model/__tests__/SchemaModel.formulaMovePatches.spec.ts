import { describe, it, expect } from '@jest/globals';
import { createSchemaModel } from '../SchemaModelImpl.js';
import { obj, num } from '../../../mocks/schema.mocks.js';
import { findNodeIdByName } from './test-helpers.js';

describe('SchemaModel formula move patches', () => {
  describe('move formula field into nested object', () => {
    const createSchemaWithFormulaAndNested = () =>
      obj({
        value: num(),
        sum: num({ readOnly: true, formula: 'value + 2' }),
        nested: obj({}),
      });

    it('generates move + replace when formula field moved to new parent', () => {
      const model = createSchemaModel(createSchemaWithFormulaAndNested());
      const sumId = findNodeIdByName(model, 'sum');
      const nestedId = findNodeIdByName(model, 'nested');

      model.moveNode(sumId!, nestedId!);

      expect(model.patches).toMatchSnapshot();
    });
  });

  describe('move formula dependency', () => {
    const createSchemaWithFormulaAndNested = () =>
      obj({
        value: num(),
        sum: num({ readOnly: true, formula: 'value + 2' }),
        nested: obj({}),
      });

    it('generates replace for formula when dependency is moved', () => {
      const model = createSchemaModel(createSchemaWithFormulaAndNested());
      const valueId = findNodeIdByName(model, 'value');
      const nestedId = findNodeIdByName(model, 'nested');

      model.moveNode(valueId!, nestedId!);

      expect(model.patches).toMatchSnapshot();
    });
  });

  describe('rename formula dependency', () => {
    const schemaWithFormula = () =>
      obj({
        price: num(),
        quantity: num(),
        total: num({ readOnly: true, formula: 'price * quantity' }),
      });

    it('generates replace for formula when referenced field is renamed', () => {
      const model = createSchemaModel(schemaWithFormula());
      const priceId = findNodeIdByName(model, 'price');

      model.renameField(priceId!, 'cost');

      expect(model.patches).toMatchSnapshot();
    });
  });
});
