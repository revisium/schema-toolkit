import type { JsonObjectSchema } from '../../../types/index.js';
import { createSchemaTree } from '../../../core/schema-tree/index.js';
import { SchemaParser } from '../../schema-model/SchemaParser.js';
import { ParsedFormula } from '../parsing/index.js';
import { FormulaDependencyIndex } from '../store/index.js';
import { obj, num } from '../../../mocks/schema.mocks.js';

const createTree = (schema: JsonObjectSchema) => {
  const parser = new SchemaParser();
  const root = parser.parse(schema);
  return createSchemaTree(root);
};

describe('FormulaDependencyIndex', () => {
  describe('registerFormula / getDependents', () => {
    it('tracks simple dependency', () => {
      const schema = obj({
        price: num(),
        total: num(),
      });

      const tree = createTree(schema);
      const index = new FormulaDependencyIndex();

      const priceNode = tree.root().property('price');
      const totalNode = tree.root().property('total');

      const formula = new ParsedFormula(tree, totalNode.id(), 'price * 2');
      index.registerFormula(totalNode.id(), formula);

      const dependents = index.getDependents(priceNode.id());
      expect(dependents).toHaveLength(1);
      expect(dependents[0]).toBe(totalNode.id());
    });

    it('tracks multiple dependents', () => {
      const schema = obj({
        price: num(),
        doubled: num(),
        tripled: num(),
      });

      const tree = createTree(schema);
      const index = new FormulaDependencyIndex();

      const priceNode = tree.root().property('price');
      const doubledNode = tree.root().property('doubled');
      const tripledNode = tree.root().property('tripled');

      const formula1 = new ParsedFormula(tree, doubledNode.id(), 'price * 2');
      const formula2 = new ParsedFormula(tree, tripledNode.id(), 'price * 3');
      index.registerFormula(doubledNode.id(), formula1);
      index.registerFormula(tripledNode.id(), formula2);

      const dependents = index.getDependents(priceNode.id());
      expect(dependents).toHaveLength(2);
      expect(dependents).toContain(doubledNode.id());
      expect(dependents).toContain(tripledNode.id());
    });

    it('returns empty array for field with no dependents', () => {
      const schema = obj({
        price: num(),
        quantity: num(),
      });

      const tree = createTree(schema);
      const index = new FormulaDependencyIndex();

      const priceNode = tree.root().property('price');
      const dependents = index.getDependents(priceNode.id());

      expect(dependents).toEqual([]);
    });
  });

  describe('unregisterFormula', () => {
    it('removes dependency tracking', () => {
      const schema = obj({
        price: num(),
        total: num(),
      });

      const tree = createTree(schema);
      const index = new FormulaDependencyIndex();

      const priceNode = tree.root().property('price');
      const totalNode = tree.root().property('total');

      const formula = new ParsedFormula(tree, totalNode.id(), 'price * 2');
      index.registerFormula(totalNode.id(), formula);

      expect(index.getDependents(priceNode.id())).toHaveLength(1);

      index.unregisterFormula(totalNode.id());

      expect(index.getDependents(priceNode.id())).toHaveLength(0);
    });

    it('handles unregistering non-existent formula', () => {
      const index = new FormulaDependencyIndex();

      expect(() => {
        index.unregisterFormula('non-existent');
      }).not.toThrow();
    });
  });

  describe('hasDependents', () => {
    it('returns true when field has dependents', () => {
      const schema = obj({
        price: num(),
        total: num(),
      });

      const tree = createTree(schema);
      const index = new FormulaDependencyIndex();

      const priceNode = tree.root().property('price');
      const totalNode = tree.root().property('total');

      const formula = new ParsedFormula(tree, totalNode.id(), 'price * 2');
      index.registerFormula(totalNode.id(), formula);

      expect(index.hasDependents(priceNode.id())).toBe(true);
    });

    it('returns false when field has no dependents', () => {
      const schema = obj({
        price: num(),
        quantity: num(),
      });

      const tree = createTree(schema);
      const index = new FormulaDependencyIndex();

      const priceNode = tree.root().property('price');
      expect(index.hasDependents(priceNode.id())).toBe(false);
    });
  });

  describe('getFormula / hasFormula', () => {
    it('returns formula for node with formula', () => {
      const schema = obj({
        price: num(),
        total: num(),
      });

      const tree = createTree(schema);
      const index = new FormulaDependencyIndex();

      const totalNode = tree.root().property('total');
      const formula = new ParsedFormula(tree, totalNode.id(), 'price * 2');
      index.registerFormula(totalNode.id(), formula);

      expect(index.getFormula(totalNode.id())).toBe(formula);
      expect(index.hasFormula(totalNode.id())).toBe(true);
    });

    it('returns null for node without formula', () => {
      const schema = obj({
        price: num(),
      });

      const tree = createTree(schema);
      const index = new FormulaDependencyIndex();

      const priceNode = tree.root().property('price');
      expect(index.getFormula(priceNode.id())).toBeNull();
      expect(index.hasFormula(priceNode.id())).toBe(false);
    });
  });

  describe('clear', () => {
    it('removes all formulas', () => {
      const schema = obj({
        price: num(),
        total: num(),
      });

      const tree = createTree(schema);
      const index = new FormulaDependencyIndex();

      const priceNode = tree.root().property('price');
      const totalNode = tree.root().property('total');

      const formula = new ParsedFormula(tree, totalNode.id(), 'price * 2');
      index.registerFormula(totalNode.id(), formula);

      expect(index.getDependents(priceNode.id())).toHaveLength(1);
      expect(index.size()).toBe(1);

      index.clear();

      expect(index.getDependents(priceNode.id())).toHaveLength(0);
      expect(index.size()).toBe(0);
    });
  });

  describe('forEachFormula', () => {
    it('iterates over all formulas', () => {
      const schema = obj({
        a: num(),
        b: num(),
        c: num(),
      });

      const tree = createTree(schema);
      const index = new FormulaDependencyIndex();

      const bNode = tree.root().property('b');
      const cNode = tree.root().property('c');

      const formulaB = new ParsedFormula(tree, bNode.id(), 'a + 1');
      const formulaC = new ParsedFormula(tree, cNode.id(), 'a + 2');
      index.registerFormula(bNode.id(), formulaB);
      index.registerFormula(cNode.id(), formulaC);

      const collected: string[] = [];
      index.forEachFormula((nodeId) => {
        collected.push(nodeId);
      });

      expect(collected).toHaveLength(2);
      expect(collected).toContain(bNode.id());
      expect(collected).toContain(cNode.id());
    });
  });

  describe('re-registration', () => {
    it('updates dependencies when formula is re-registered', () => {
      const schema = obj({
        a: num(),
        b: num(),
        total: num(),
      });

      const tree = createTree(schema);
      const index = new FormulaDependencyIndex();

      const aNodeId = tree.root().property('a').id();
      const bNodeId = tree.root().property('b').id();
      const totalNode = tree.root().property('total');

      const formula1 = new ParsedFormula(tree, totalNode.id(), 'a + 1');
      index.registerFormula(totalNode.id(), formula1);

      expect(index.getDependents(aNodeId)).toHaveLength(1);
      expect(index.getDependents(bNodeId)).toHaveLength(0);

      const formula2 = new ParsedFormula(tree, totalNode.id(), 'b + 1');
      index.registerFormula(totalNode.id(), formula2);

      expect(index.getDependents(aNodeId)).toHaveLength(0);
      expect(index.getDependents(bNodeId)).toHaveLength(1);
    });
  });
});
