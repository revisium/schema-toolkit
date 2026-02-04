import type { JsonObjectSchema } from '../../../types/index.js';
import { createSchemaTree } from '../../../core/schema-tree/index.js';
import { SchemaParser } from '../../schema-model/SchemaParser.js';
import { ParsedFormula } from '../parsing/index.js';
import { FormulaError } from '../core/index.js';
import { obj, num, arr } from '../../../mocks/schema.mocks.js';

const createTree = (schema: JsonObjectSchema) => {
  const parser = new SchemaParser();
  const root = parser.parse(schema);
  return createSchemaTree(root);
};

describe('ParsedFormula', () => {
  describe('simple dependencies', () => {
    it('resolves sibling field dependencies', () => {
      const schema = obj({
        price: num(),
        quantity: num(),
        total: num(),
      });

      const tree = createTree(schema);
      const totalNode = tree.root().property('total');
      const priceNode = tree.root().property('price');
      const quantityNode = tree.root().property('quantity');

      const formula = new ParsedFormula(tree, totalNode.id(), 'price * quantity');

      expect(formula.version()).toBe(1);
      expect(formula.ast()).toBeDefined();
      expect(formula.dependencies()).toHaveLength(2);
      expect(formula.getNodeIdForAstPath('price')).toBe(priceNode.id());
      expect(formula.getNodeIdForAstPath('quantity')).toBe(quantityNode.id());
    });

    it('resolves single dependency', () => {
      const schema = obj({
        a: num(),
        b: num(),
      });

      const tree = createTree(schema);
      const bNode = tree.root().property('b');
      const aNode = tree.root().property('a');

      const formula = new ParsedFormula(tree, bNode.id(), 'a + 1');

      expect(formula.dependencies()).toHaveLength(1);
      expect(formula.dependencies()[0]?.targetNodeId()).toBe(aNode.id());
    });

    it('handles formula with no dependencies (literal)', () => {
      const schema = obj({
        value: num(),
      });

      const tree = createTree(schema);
      const valueNode = tree.root().property('value');

      const formula = new ParsedFormula(tree, valueNode.id(), '42');

      expect(formula.dependencies()).toHaveLength(0);
      expect(formula.astPaths()).toHaveLength(0);
    });
  });

  describe('nested object dependencies', () => {
    it('resolves nested field dependencies', () => {
      const schema = obj({
        item: obj({
          price: num(),
          discount: num(),
          total: num(),
        }),
      });

      const tree = createTree(schema);
      const itemNode = tree.root().property('item');
      const totalNode = itemNode.property('total');
      const priceNode = itemNode.property('price');
      const discountNode = itemNode.property('discount');

      const formula = new ParsedFormula(tree, totalNode.id(), 'price - discount');

      expect(formula.dependencies()).toHaveLength(2);
      expect(formula.getNodeIdForAstPath('price')).toBe(priceNode.id());
      expect(formula.getNodeIdForAstPath('discount')).toBe(discountNode.id());
    });
  });

  describe('array item dependencies', () => {
    it('resolves dependencies within array items', () => {
      const schema = obj({
        items: arr(
          obj({
            price: num(),
            qty: num(),
            subtotal: num(),
          }),
        ),
      });

      const tree = createTree(schema);
      const itemsNode = tree.root().property('items');
      const itemNode = itemsNode.items();
      const subtotalNode = itemNode.property('subtotal');
      const priceNode = itemNode.property('price');
      const qtyNode = itemNode.property('qty');

      const formula = new ParsedFormula(tree, subtotalNode.id(), 'price * qty');

      expect(formula.dependencies()).toHaveLength(2);
      expect(formula.getNodeIdForAstPath('price')).toBe(priceNode.id());
      expect(formula.getNodeIdForAstPath('qty')).toBe(qtyNode.id());
    });
  });

  describe('error handling', () => {
    it('throws error for non-existent formula node', () => {
      const schema = obj({
        a: num(),
      });

      const tree = createTree(schema);

      expect(() => {
        new ParsedFormula(tree, 'non-existent-id', 'a + 1');
      }).toThrow(FormulaError);
    });

    it('throws error for unresolvable dependency', () => {
      const schema = obj({
        a: num(),
      });

      const tree = createTree(schema);
      const aNode = tree.root().property('a');

      expect(() => {
        new ParsedFormula(tree, aNode.id(), 'nonExistent + 1');
      }).toThrow(FormulaError);

      try {
        new ParsedFormula(tree, aNode.id(), 'nonExistent + 1');
      } catch (e) {
        expect(e).toBeInstanceOf(FormulaError);
        expect((e as FormulaError).nodeId).toBe(aNode.id());
        expect((e as FormulaError).message).toContain('Cannot resolve formula dependency');
      }
    });

    it('throws error for self-reference', () => {
      const schema = obj({
        value: num(),
      });

      const tree = createTree(schema);
      const valueNode = tree.root().property('value');

      expect(() => {
        new ParsedFormula(tree, valueNode.id(), 'value + 1');
      }).toThrow(FormulaError);

      try {
        new ParsedFormula(tree, valueNode.id(), 'value + 1');
      } catch (e) {
        expect((e as FormulaError).message).toContain('cannot reference itself');
      }
    });
  });

  describe('astPaths', () => {
    it('returns all dependency paths', () => {
      const schema = obj({
        a: num(),
        b: num(),
        c: num(),
      });

      const tree = createTree(schema);
      const cNode = tree.root().property('c');

      const formula = new ParsedFormula(tree, cNode.id(), 'a + b');

      const paths = formula.astPaths();
      expect(paths).toHaveLength(2);
      expect(paths).toContain('a');
      expect(paths).toContain('b');
    });
  });
});
