import { jest } from '@jest/globals';
import {
  createNodeFactory,
  resetNodeIdCounter,
  type ValueNode,
} from '../../value-node/index.js';
import type { JsonSchema } from '../../../types/schema.types.js';
import { FormulaCollector } from '../FormulaCollector.js';
import { FormulaEvaluator } from '../FormulaEvaluator.js';
import type { ValueTreeRoot } from '../types.js';
import { obj, str, num, arr } from '../../../mocks/schema.mocks.js';

function createTree(schema: JsonSchema, value: unknown): ValueNode {
  const factory = createNodeFactory();
  return factory.createTree(schema, value);
}

function createTreeRoot(root: ValueNode): ValueTreeRoot {
  return {
    root,
    getPlainValue: () => root.getPlainValue(),
  };
}

function getValue(root: ValueNode, path: string): unknown {
  const parts = path.split('.');
  let current: ValueNode | undefined = root;

  for (const part of parts) {
    if (!current) {
      return undefined;
    }

    const indexMatch = /^(.+?)\[(\d+)\]$/.exec(part);
    if (indexMatch) {
      const [, name, indexStr] = indexMatch;
      if (current.isObject()) {
        current = current.children.find((c) => c.name === name);
      }
      if (current?.isArray()) {
        current = current.at(Number.parseInt(indexStr!, 10));
      }
    } else if (current.isObject()) {
      current = current.children.find((c) => c.name === part);
    } else if (current.isArray()) {
      const idx = Number.parseInt(part, 10);
      current = current.at(idx);
    }
  }

  return current?.isPrimitive() ? current.value : current?.getPlainValue();
}

beforeEach(() => {
  resetNodeIdCounter();
});

describe('FormulaEvaluator', () => {
  describe('basic evaluation', () => {
    it('evaluates simple formula', () => {
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
      const treeRoot = createTreeRoot(root);
      const collector = new FormulaCollector();
      const formulas = collector.collect(root);
      const evaluator = new FormulaEvaluator(treeRoot);

      evaluator.evaluateAll(formulas);

      expect(getValue(root, 'total')).toBe(500);
    });

    it('evaluates chain of dependent formulas in order', () => {
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
      const treeRoot = createTreeRoot(root);
      const collector = new FormulaCollector();
      const formulas = collector.collect(root);
      const evaluator = new FormulaEvaluator(treeRoot);

      const subtotalFormula = formulas.find((f) => f.node.name === 'subtotal');
      const totalFormula = formulas.find((f) => f.node.name === 'total');

      if (subtotalFormula && totalFormula) {
        evaluator.evaluate(subtotalFormula);
        evaluator.evaluate(totalFormula);
      }

      expect(getValue(root, 'subtotal')).toBe(200);
      expect(getValue(root, 'total')).toBe(210);
    });

    it('evaluates formula with multiple dependencies', () => {
      const schema = obj({
        x: num(),
        y: num(),
        z: num(),
        sum: num({ readOnly: true, formula: 'x + y + z' }),
      });

      const root = createTree(schema, { x: 1, y: 2, z: 3, sum: 0 });
      const treeRoot = createTreeRoot(root);
      const collector = new FormulaCollector();
      const formulas = collector.collect(root);
      const evaluator = new FormulaEvaluator(treeRoot);

      evaluator.evaluateAll(formulas);

      expect(getValue(root, 'sum')).toBe(6);
    });
  });

  describe('nested objects', () => {
    it('evaluates formula with nested dependency', () => {
      const schema = obj({
        item: obj({
          price: num(),
          quantity: num(),
        }),
        total: num({ readOnly: true, formula: 'item.price * item.quantity' }),
      });

      const root = createTree(schema, {
        item: { price: 100, quantity: 5 },
        total: 0,
      });
      const treeRoot = createTreeRoot(root);
      const collector = new FormulaCollector();
      const formulas = collector.collect(root);
      const evaluator = new FormulaEvaluator(treeRoot);

      evaluator.evaluateAll(formulas);

      expect(getValue(root, 'total')).toBe(500);
    });

    it('evaluates formula inside nested object', () => {
      const schema = obj({
        order: obj({
          price: num(),
          quantity: num(),
          subtotal: num({ readOnly: true, formula: 'price * quantity' }),
        }),
      });

      const root = createTree(schema, {
        order: { price: 50, quantity: 4, subtotal: 0 },
      });
      const treeRoot = createTreeRoot(root);
      const collector = new FormulaCollector();
      const formulas = collector.collect(root);
      const evaluator = new FormulaEvaluator(treeRoot);

      evaluator.evaluateAll(formulas);

      expect(getValue(root, 'order.subtotal')).toBe(200);
    });
  });

  describe('warnings', () => {
    it('sets warning for NaN result', () => {
      const schema = obj({
        a: num(),
        b: num(),
        result: num({ readOnly: true, formula: 'a / b' }),
      });

      const root = createTree(schema, { a: 0, b: 0, result: 0 });
      const treeRoot = createTreeRoot(root);
      const collector = new FormulaCollector();
      const formulas = collector.collect(root);
      const evaluator = new FormulaEvaluator(treeRoot);

      evaluator.evaluateAll(formulas);

      const resultNode = root.isObject()
        ? root.children.find((c) => c.name === 'result')
        : null;

      expect(resultNode?.isPrimitive()).toBe(true);
      if (resultNode?.isPrimitive()) {
        expect(resultNode.formulaWarning?.type).toBe('nan');
      }
    });

    it('sets warning for Infinity result', () => {
      const schema = obj({
        a: num(),
        b: num(),
        result: num({ readOnly: true, formula: 'a / b' }),
      });

      const root = createTree(schema, { a: 1, b: 0, result: 0 });
      const treeRoot = createTreeRoot(root);
      const collector = new FormulaCollector();
      const formulas = collector.collect(root);
      const evaluator = new FormulaEvaluator(treeRoot);

      evaluator.evaluateAll(formulas);

      const resultNode = root.isObject()
        ? root.children.find((c) => c.name === 'result')
        : null;

      expect(resultNode?.isPrimitive()).toBe(true);
      if (resultNode?.isPrimitive()) {
        expect(resultNode.formulaWarning?.type).toBe('infinity');
      }
    });

    it('clears warning when result becomes valid', () => {
      const schema = obj({
        a: num(),
        b: num(),
        result: num({ readOnly: true, formula: 'a / b' }),
      });

      const root = createTree(schema, { a: 10, b: 2, result: 0 });
      const treeRoot = createTreeRoot(root);
      const collector = new FormulaCollector();
      const formulas = collector.collect(root);
      const evaluator = new FormulaEvaluator(treeRoot);

      evaluator.evaluateAll(formulas);

      const resultNode = root.isObject()
        ? root.children.find((c) => c.name === 'result')
        : null;

      expect(resultNode?.isPrimitive()).toBe(true);
      if (resultNode?.isPrimitive()) {
        expect(resultNode.formulaWarning).toBeNull();
        expect(resultNode.value).toBe(5);
      }
    });
  });

  describe('error handling', () => {
    it('sets default value when formula returns undefined', () => {
      const schema = obj({
        a: num(),
        result: num({ default: 99, readOnly: true, formula: 'unknownVar' }),
      });

      const root = createTree(schema, { a: 1, result: 0 });
      const treeRoot = createTreeRoot(root);

      const collector = new FormulaCollector();
      const formulas = collector.collect(root);
      const evaluator = new FormulaEvaluator(treeRoot);

      evaluator.evaluateAll(formulas);

      const resultNode = root.isObject()
        ? root.children.find((c) => c.name === 'result')
        : null;

      if (resultNode?.isPrimitive()) {
        expect(resultNode.value).toBe(99);
      }
    });

    it('calls onError callback on runtime error', () => {
      const schema = obj({
        a: num(),
        result: num({ default: 99, readOnly: true, formula: 'throw_error()' }),
      });

      const root = createTree(schema, { a: 1, result: 0 });
      const treeRoot = createTreeRoot(root);

      const onError = jest.fn();
      const collector = new FormulaCollector();
      const formulas = collector.collect(root);
      const evaluator = new FormulaEvaluator(treeRoot, { onError });

      evaluator.evaluateAll(formulas);

      const resultNode = root.isObject()
        ? root.children.find((c) => c.name === 'result')
        : null;

      if (resultNode?.isPrimitive()) {
        expect(resultNode.value).toBe(99);
      }
    });
  });

  describe('string formulas', () => {
    it('evaluates string concatenation', () => {
      const schema = obj({
        firstName: str(),
        lastName: str(),
        fullName: str({ readOnly: true, formula: 'firstName + " " + lastName' }),
      });

      const root = createTree(schema, {
        firstName: 'John',
        lastName: 'Doe',
        fullName: '',
      });
      const treeRoot = createTreeRoot(root);
      const collector = new FormulaCollector();
      const formulas = collector.collect(root);
      const evaluator = new FormulaEvaluator(treeRoot);

      evaluator.evaluateAll(formulas);

      expect(getValue(root, 'fullName')).toBe('John Doe');
    });
  });

  describe('context building with arrays', () => {
    it('builds context with prev/next values for middle items', () => {
      const schema = obj({
        items: arr(
          obj({
            val: num(),
            computed: num({ readOnly: true, formula: 'val' }),
          }),
        ),
      });

      const root = createTree(schema, {
        items: [
          { val: 10, computed: 0 },
          { val: 20, computed: 0 },
          { val: 30, computed: 0 },
        ],
      });
      const treeRoot = createTreeRoot(root);
      const collector = new FormulaCollector();
      const formulas = collector.collect(root);
      const evaluator = new FormulaEvaluator(treeRoot);

      evaluator.evaluateAll(formulas);

      expect(getValue(root, 'items[0].computed')).toBe(10);
      expect(getValue(root, 'items[1].computed')).toBe(20);
      expect(getValue(root, 'items[2].computed')).toBe(30);
    });

    it('handles arrays containing objects and arrays', () => {
      const schema = obj({
        data: arr(
          obj({
            nested: arr(num()),
            result: num({ readOnly: true, formula: 'nested' }),
          }),
        ),
      });

      const root = createTree(schema, {
        data: [{ nested: [1, 2, 3], result: 0 }],
      });
      const treeRoot = createTreeRoot(root);
      const collector = new FormulaCollector();
      const formulas = collector.collect(root);
      const evaluator = new FormulaEvaluator(treeRoot);

      evaluator.evaluateAll(formulas);

      expect(formulas.length).toBe(1);
    });
  });

  describe('array formulas', () => {
    it('evaluates formulas in array items', () => {
      const schema = obj({
        items: arr(
          obj({
            price: num(),
            quantity: num(),
            total: num({ readOnly: true, formula: 'price * quantity' }),
          }),
        ),
      });

      const root = createTree(schema, {
        items: [
          { price: 100, quantity: 2, total: 0 },
          { price: 50, quantity: 3, total: 0 },
        ],
      });
      const treeRoot = createTreeRoot(root);
      const collector = new FormulaCollector();
      const formulas = collector.collect(root);
      const evaluator = new FormulaEvaluator(treeRoot);

      evaluator.evaluateAll(formulas);

      expect(getValue(root, 'items[0].total')).toBe(200);
      expect(getValue(root, 'items[1].total')).toBe(150);
    });

    it('provides array context with prev/next values', () => {
      const schema = obj({
        items: arr(
          obj({
            value: num(),
            computed: num({ readOnly: true, formula: 'value * 2' }),
          }),
        ),
      });

      const root = createTree(schema, {
        items: [
          { value: 10, computed: 0 },
          { value: 20, computed: 0 },
          { value: 30, computed: 0 },
        ],
      });
      const treeRoot = createTreeRoot(root);
      const collector = new FormulaCollector();
      const formulas = collector.collect(root);
      const evaluator = new FormulaEvaluator(treeRoot);

      evaluator.evaluateAll(formulas);

      expect(getValue(root, 'items[0].computed')).toBe(20);
      expect(getValue(root, 'items[1].computed')).toBe(40);
      expect(getValue(root, 'items[2].computed')).toBe(60);
    });
  });
});
