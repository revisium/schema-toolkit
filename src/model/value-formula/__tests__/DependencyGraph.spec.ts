import { createNodeFactory, resetNodeIdCounter } from '../../value-node/index.js';
import type { JsonSchema } from '../../../types/schema.types.js';
import { FormulaCollector } from '../FormulaCollector.js';
import { DependencyGraph } from '../DependencyGraph.js';
import { obj, num } from '../../../mocks/schema.mocks.js';

function createTree(schema: JsonSchema, value: unknown) {
  const factory = createNodeFactory();
  return factory.createTree(schema, value);
}

beforeEach(() => {
  resetNodeIdCounter();
});

describe('DependencyGraph', () => {
  describe('buildDependencyMap', () => {
    it('builds dependency map for simple formulas', () => {
      const schema = obj({
        price: num(),
        quantity: num(),
        total: num({ readOnly: true, formula: 'price * quantity' }),
      });

      const root = createTree(schema, {
        price: 100,
        quantity: 5,
        total: 0,
      });
      const collector = new FormulaCollector();
      const formulas = collector.collect(root);

      const graph = new DependencyGraph();
      const depMap = graph.buildDependencyMap(formulas);

      const totalFormula = formulas.find((f) => f.node.name === 'total');
      expect(totalFormula).toBeDefined();

      let priceEntry: ReturnType<typeof depMap.get> = undefined;
      let quantityEntry: ReturnType<typeof depMap.get> = undefined;

      for (const [node, deps] of depMap) {
        if (node.name === 'price') {
          priceEntry = deps;
        }
        if (node.name === 'quantity') {
          quantityEntry = deps;
        }
      }

      expect(priceEntry).toBeDefined();
      expect(quantityEntry).toBeDefined();
      expect(priceEntry?.has(totalFormula!)).toBe(true);
      expect(quantityEntry?.has(totalFormula!)).toBe(true);
    });

    it('returns empty map when no formulas exist', () => {
      const schema = obj({
        a: num(),
        b: num(),
      });

      const root = createTree(schema, { a: 1, b: 2 });
      const collector = new FormulaCollector();
      const formulas = collector.collect(root);

      const graph = new DependencyGraph();
      const depMap = graph.buildDependencyMap(formulas);

      expect(depMap.size).toBe(0);
    });

    it('handles multiple formulas depending on same value', () => {
      const schema = obj({
        value: num(),
        doubled: num({ readOnly: true, formula: 'value * 2' }),
        tripled: num({ readOnly: true, formula: 'value * 3' }),
      });

      const root = createTree(schema, { value: 10, doubled: 0, tripled: 0 });
      const collector = new FormulaCollector();
      const formulas = collector.collect(root);

      const graph = new DependencyGraph();
      const depMap = graph.buildDependencyMap(formulas);

      let valueEntry: ReturnType<typeof depMap.get> = undefined;
      for (const [node, deps] of depMap) {
        if (node.name === 'value') {
          valueEntry = deps;
        }
      }

      expect(valueEntry).toBeDefined();
      expect(valueEntry?.size).toBe(2);
    });
  });

  describe('buildEvaluationOrder', () => {
    it('orders formulas by dependencies', () => {
      const schema = obj({
        price: num(),
        subtotal: num({ readOnly: true, formula: 'price * 2' }),
        total: num({ readOnly: true, formula: 'subtotal + 10' }),
      });

      const root = createTree(schema, {
        price: 100,
        subtotal: 0,
        total: 0,
      });
      const collector = new FormulaCollector();
      const formulas = collector.collect(root);

      const graph = new DependencyGraph();
      const order = graph.buildEvaluationOrder(formulas);

      const subtotalIndex = order.findIndex((f) => f.node.name === 'subtotal');
      const totalIndex = order.findIndex((f) => f.node.name === 'total');

      expect(subtotalIndex).toBeLessThan(totalIndex);
    });

    it('handles independent formulas', () => {
      const schema = obj({
        a: num(),
        b: num(),
        c: num({ readOnly: true, formula: 'a * 2' }),
        d: num({ readOnly: true, formula: 'b * 3' }),
      });

      const root = createTree(schema, { a: 1, b: 2, c: 0, d: 0 });
      const collector = new FormulaCollector();
      const formulas = collector.collect(root);

      const graph = new DependencyGraph();
      const order = graph.buildEvaluationOrder(formulas);

      expect(order.length).toBe(2);
      const names = order.map((f) => f.node.name);
      expect(names).toContain('c');
      expect(names).toContain('d');
    });

    it('handles long chains A -> B -> C -> D', () => {
      const schema = obj({
        a: num(),
        b: num({ readOnly: true, formula: 'a + 1' }),
        c: num({ readOnly: true, formula: 'b + 1' }),
        d: num({ readOnly: true, formula: 'c + 1' }),
      });

      const root = createTree(schema, { a: 1, b: 0, c: 0, d: 0 });
      const collector = new FormulaCollector();
      const formulas = collector.collect(root);

      const graph = new DependencyGraph();
      const order = graph.buildEvaluationOrder(formulas);

      const bIndex = order.findIndex((f) => f.node.name === 'b');
      const cIndex = order.findIndex((f) => f.node.name === 'c');
      const dIndex = order.findIndex((f) => f.node.name === 'd');

      expect(bIndex).toBeLessThan(cIndex);
      expect(cIndex).toBeLessThan(dIndex);
    });
  });

  describe('getAffectedFormulas', () => {
    it('gets affected formulas for changed node', () => {
      const schema = obj({
        price: num(),
        subtotal: num({ readOnly: true, formula: 'price * 2' }),
        total: num({ readOnly: true, formula: 'subtotal + 10' }),
      });

      const root = createTree(schema, {
        price: 100,
        subtotal: 0,
        total: 0,
      });
      const collector = new FormulaCollector();
      const formulas = collector.collect(root);

      const graph = new DependencyGraph();
      const depMap = graph.buildDependencyMap(formulas);
      const order = graph.buildEvaluationOrder(formulas);

      const priceNode = root.isObject()
        ? root.children.find((c) => c.name === 'price')
        : null;
      expect(priceNode?.isPrimitive()).toBe(true);

      if (!priceNode?.isPrimitive()) {
        throw new Error('Expected primitive node');
      }

      const affected = graph.getAffectedFormulas(priceNode, depMap, order);
      const affectedNames = affected.map((f) => f.node.name);

      expect(affectedNames).toContain('subtotal');
      expect(affectedNames).toContain('total');

      const subtotalIndex = affected.findIndex(
        (f) => f.node.name === 'subtotal',
      );
      const totalIndex = affected.findIndex((f) => f.node.name === 'total');
      expect(subtotalIndex).toBeLessThan(totalIndex);
    });

    it('returns empty when changed node has no dependents', () => {
      const schema = obj({
        a: num(),
        b: num(),
        c: num({ readOnly: true, formula: 'b * 2' }),
      });

      const root = createTree(schema, { a: 1, b: 2, c: 0 });
      const collector = new FormulaCollector();
      const formulas = collector.collect(root);

      const graph = new DependencyGraph();
      const depMap = graph.buildDependencyMap(formulas);
      const order = graph.buildEvaluationOrder(formulas);

      const aNode = root.isObject()
        ? root.children.find((c) => c.name === 'a')
        : null;

      if (!aNode?.isPrimitive()) {
        throw new Error('Expected primitive node');
      }

      const affected = graph.getAffectedFormulas(aNode, depMap, order);
      expect(affected.length).toBe(0);
    });

    it('handles cascading dependencies', () => {
      const schema = obj({
        a: num(),
        b: num({ readOnly: true, formula: 'a * 2' }),
        c: num({ readOnly: true, formula: 'b + 1' }),
        d: num({ readOnly: true, formula: 'c + 10' }),
      });

      const root = createTree(schema, { a: 5, b: 0, c: 0, d: 0 });
      const collector = new FormulaCollector();
      const formulas = collector.collect(root);

      const graph = new DependencyGraph();
      const depMap = graph.buildDependencyMap(formulas);
      const order = graph.buildEvaluationOrder(formulas);

      const aNode = root.isObject()
        ? root.children.find((c) => c.name === 'a')
        : null;

      if (!aNode?.isPrimitive()) {
        throw new Error('Expected primitive node');
      }

      const affected = graph.getAffectedFormulas(aNode, depMap, order);
      const names = affected.map((f) => f.node.name);

      expect(names).toContain('b');
      expect(names).toContain('c');
      expect(names).toContain('d');
      expect(names.length).toBe(3);
    });
  });
});
