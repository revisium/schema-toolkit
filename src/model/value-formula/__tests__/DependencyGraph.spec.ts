import { createNodeFactory, resetNodeIdCounter } from '../../value-node/index.js';
import { JsonSchemaTypeName, type JsonSchema } from '../../../types/schema.types.js';
import { FormulaCollector } from '../FormulaCollector.js';
import { DependencyGraph } from '../DependencyGraph.js';

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
      const schema: JsonSchema = {
        type: JsonSchemaTypeName.Object,
        properties: {
          price: { type: JsonSchemaTypeName.Number, default: 0 },
          quantity: { type: JsonSchemaTypeName.Number, default: 0 },
          total: {
            type: JsonSchemaTypeName.Number,
            default: 0,
            readOnly: true,
            'x-formula': { version: 1, expression: 'price * quantity' },
          },
        },
        additionalProperties: false,
        required: ['price', 'quantity', 'total'],
      };

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
      const schema: JsonSchema = {
        type: JsonSchemaTypeName.Object,
        properties: {
          a: { type: JsonSchemaTypeName.Number, default: 0 },
          b: { type: JsonSchemaTypeName.Number, default: 0 },
        },
        additionalProperties: false,
        required: ['a', 'b'],
      };

      const root = createTree(schema, { a: 1, b: 2 });
      const collector = new FormulaCollector();
      const formulas = collector.collect(root);

      const graph = new DependencyGraph();
      const depMap = graph.buildDependencyMap(formulas);

      expect(depMap.size).toBe(0);
    });

    it('handles multiple formulas depending on same value', () => {
      const schema: JsonSchema = {
        type: JsonSchemaTypeName.Object,
        properties: {
          value: { type: JsonSchemaTypeName.Number, default: 0 },
          doubled: {
            type: JsonSchemaTypeName.Number,
            default: 0,
            readOnly: true,
            'x-formula': { version: 1, expression: 'value * 2' },
          },
          tripled: {
            type: JsonSchemaTypeName.Number,
            default: 0,
            readOnly: true,
            'x-formula': { version: 1, expression: 'value * 3' },
          },
        },
        additionalProperties: false,
        required: ['value', 'doubled', 'tripled'],
      };

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
      const schema: JsonSchema = {
        type: JsonSchemaTypeName.Object,
        properties: {
          price: { type: JsonSchemaTypeName.Number, default: 0 },
          subtotal: {
            type: JsonSchemaTypeName.Number,
            default: 0,
            readOnly: true,
            'x-formula': { version: 1, expression: 'price * 2' },
          },
          total: {
            type: JsonSchemaTypeName.Number,
            default: 0,
            readOnly: true,
            'x-formula': { version: 1, expression: 'subtotal + 10' },
          },
        },
        additionalProperties: false,
        required: ['price', 'subtotal', 'total'],
      };

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
      const schema: JsonSchema = {
        type: JsonSchemaTypeName.Object,
        properties: {
          a: { type: JsonSchemaTypeName.Number, default: 0 },
          b: { type: JsonSchemaTypeName.Number, default: 0 },
          c: {
            type: JsonSchemaTypeName.Number,
            default: 0,
            readOnly: true,
            'x-formula': { version: 1, expression: 'a * 2' },
          },
          d: {
            type: JsonSchemaTypeName.Number,
            default: 0,
            readOnly: true,
            'x-formula': { version: 1, expression: 'b * 3' },
          },
        },
        additionalProperties: false,
        required: ['a', 'b', 'c', 'd'],
      };

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
      const schema: JsonSchema = {
        type: JsonSchemaTypeName.Object,
        properties: {
          a: { type: JsonSchemaTypeName.Number, default: 0 },
          b: {
            type: JsonSchemaTypeName.Number,
            default: 0,
            readOnly: true,
            'x-formula': { version: 1, expression: 'a + 1' },
          },
          c: {
            type: JsonSchemaTypeName.Number,
            default: 0,
            readOnly: true,
            'x-formula': { version: 1, expression: 'b + 1' },
          },
          d: {
            type: JsonSchemaTypeName.Number,
            default: 0,
            readOnly: true,
            'x-formula': { version: 1, expression: 'c + 1' },
          },
        },
        additionalProperties: false,
        required: ['a', 'b', 'c', 'd'],
      };

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
      const schema: JsonSchema = {
        type: JsonSchemaTypeName.Object,
        properties: {
          price: { type: JsonSchemaTypeName.Number, default: 0 },
          subtotal: {
            type: JsonSchemaTypeName.Number,
            default: 0,
            readOnly: true,
            'x-formula': { version: 1, expression: 'price * 2' },
          },
          total: {
            type: JsonSchemaTypeName.Number,
            default: 0,
            readOnly: true,
            'x-formula': { version: 1, expression: 'subtotal + 10' },
          },
        },
        additionalProperties: false,
        required: ['price', 'subtotal', 'total'],
      };

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
      const schema: JsonSchema = {
        type: JsonSchemaTypeName.Object,
        properties: {
          a: { type: JsonSchemaTypeName.Number, default: 0 },
          b: { type: JsonSchemaTypeName.Number, default: 0 },
          c: {
            type: JsonSchemaTypeName.Number,
            default: 0,
            readOnly: true,
            'x-formula': { version: 1, expression: 'b * 2' },
          },
        },
        additionalProperties: false,
        required: ['a', 'b', 'c'],
      };

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
      const schema: JsonSchema = {
        type: JsonSchemaTypeName.Object,
        properties: {
          a: { type: JsonSchemaTypeName.Number, default: 0 },
          b: {
            type: JsonSchemaTypeName.Number,
            default: 0,
            readOnly: true,
            'x-formula': { version: 1, expression: 'a * 2' },
          },
          c: {
            type: JsonSchemaTypeName.Number,
            default: 0,
            readOnly: true,
            'x-formula': { version: 1, expression: 'b + 1' },
          },
          d: {
            type: JsonSchemaTypeName.Number,
            default: 0,
            readOnly: true,
            'x-formula': { version: 1, expression: 'c + 10' },
          },
        },
        additionalProperties: false,
        required: ['a', 'b', 'c', 'd'],
      };

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
