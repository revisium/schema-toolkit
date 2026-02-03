import { describe, it, expect } from '@jest/globals';
import { validateFormulas } from '../formula/FormulaValidator.js';
import { createSchemaTree } from '../../schema-tree/index.js';
import {
  createObjectNode,
  createArrayNode,
  createStringNode,
  createNumberNode,
} from '../../schema-node/index.js';
import { jsonPointerToPath } from '../../path/index.js';
import { ParsedFormula } from '../../../model/schema-formula/index.js';

describe('FormulaValidator', () => {
  describe('validateFormulas', () => {
    it('returns empty array when no formulas exist', () => {
      const root = createObjectNode('root-id', 'root', [
        createStringNode('name-id', 'name'),
      ]);
      const tree = createSchemaTree(root);

      const errors = validateFormulas(tree);

      expect(errors).toHaveLength(0);
    });

    it('returns empty array when formula dependencies are valid', () => {
      const priceNode = createNumberNode('price-id', 'price');
      const quantityNode = createNumberNode('quantity-id', 'quantity');
      const totalNode = createNumberNode('total-id', 'total');
      const root = createObjectNode('root-id', 'root', [
        priceNode,
        quantityNode,
        totalNode,
      ]);
      const tree = createSchemaTree(root);

      const formula = new ParsedFormula(tree, 'total-id', 'price * quantity');
      totalNode.setFormula(formula);

      const errors = validateFormulas(tree);

      expect(errors).toHaveLength(0);
    });

    it('detects missing formula dependency after field removal', () => {
      const priceNode = createNumberNode('price-id', 'price');
      const totalNode = createNumberNode('total-id', 'total');
      const root = createObjectNode('root-id', 'root', [priceNode, totalNode]);
      const tree = createSchemaTree(root);

      const formula = new ParsedFormula(tree, 'total-id', 'price');
      totalNode.setFormula(formula);

      tree.removeNodeAt(jsonPointerToPath('/properties/price'));

      const errors = validateFormulas(tree);

      expect(errors).toHaveLength(1);
      expect(errors[0]).toMatchObject({
        nodeId: 'total-id',
        message: 'Cannot resolve formula dependency: target node not found',
        fieldPath: 'total',
      });
    });

    it('includes field path for nested fields', () => {
      const priceNode = createNumberNode('price-id', 'price');
      const computedNode = createNumberNode('computed-id', 'computed');
      const nestedObj = createObjectNode('nested-id', 'nested', [computedNode]);
      const root = createObjectNode('root-id', 'root', [priceNode, nestedObj]);
      const tree = createSchemaTree(root);

      const formula = new ParsedFormula(tree, 'computed-id', '/price');
      computedNode.setFormula(formula);

      tree.removeNodeAt(jsonPointerToPath('/properties/price'));

      const errors = validateFormulas(tree);

      expect(errors).toHaveLength(1);
      expect(errors[0]?.fieldPath).toBe('nested.computed');
    });

    it('includes field path for array items', () => {
      const priceNode = createNumberNode('price-id', 'price');
      const computedNode = createNumberNode('computed-id', 'computed');
      const itemsObj = createObjectNode('items-id', '', [computedNode]);
      const arrayNode = createArrayNode('array-id', 'items', itemsObj);
      const root = createObjectNode('root-id', 'root', [priceNode, arrayNode]);
      const tree = createSchemaTree(root);

      const formula = new ParsedFormula(tree, 'computed-id', '/price');
      computedNode.setFormula(formula);

      tree.removeNodeAt(jsonPointerToPath('/properties/price'));

      const errors = validateFormulas(tree);

      expect(errors).toHaveLength(1);
      expect(errors[0]?.fieldPath).toBe('items[*].computed');
    });

    it('collects multiple errors', () => {
      const priceNode = createNumberNode('price-id', 'price');
      const field1 = createNumberNode('field1-id', 'field1');
      const field2 = createNumberNode('field2-id', 'field2');
      const root = createObjectNode('root-id', 'root', [priceNode, field1, field2]);
      const tree = createSchemaTree(root);

      field1.setFormula(new ParsedFormula(tree, 'field1-id', 'price'));
      field2.setFormula(new ParsedFormula(tree, 'field2-id', 'price'));

      tree.removeNodeAt(jsonPointerToPath('/properties/price'));

      const errors = validateFormulas(tree);

      expect(errors).toHaveLength(2);
    });

    it('does not report error for object nodes', () => {
      const objNode = createObjectNode('obj-id', 'obj', [
        createStringNode('child-id', 'child'),
      ]);
      const root = createObjectNode('root-id', 'root', [objNode]);
      const tree = createSchemaTree(root);

      const errors = validateFormulas(tree);

      expect(errors).toHaveLength(0);
    });

    it('handles deeply nested array structures', () => {
      const priceNode = createNumberNode('price-id', 'price');
      const computedNode = createNumberNode('computed-id', 'value');
      const innerObj = createObjectNode('inner-id', '', [computedNode]);
      const innerArray = createArrayNode('inner-array-id', 'nested', innerObj);
      const outerObj = createObjectNode('outer-id', '', [innerArray]);
      const outerArray = createArrayNode('outer-array-id', 'items', outerObj);
      const root = createObjectNode('root-id', 'root', [priceNode, outerArray]);
      const tree = createSchemaTree(root);

      const formula = new ParsedFormula(tree, 'computed-id', '/price');
      computedNode.setFormula(formula);

      tree.removeNodeAt(jsonPointerToPath('/properties/price'));

      const errors = validateFormulas(tree);

      expect(errors).toHaveLength(1);
      expect(errors[0]?.fieldPath).toBe('items[*].nested[*].value');
    });
  });
});
