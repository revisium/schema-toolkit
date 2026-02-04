import {
  createNodeFactory,
  resetNodeIdCounter,
  type ValueNode,
} from '../../value-node/index.js';
import type { JsonSchema } from '../../../types/schema.types.js';
import { FormulaEngine } from '../FormulaEngine.js';
import type { ValueTreeRoot } from '../types.js';
import { obj, num, str, arr } from '../../../mocks/schema.mocks.js';

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
  const segments = path.split(/[.[\]]+/).filter(Boolean);
  let current: ValueNode | undefined = root;

  for (const segment of segments) {
    if (!current) {
      return undefined;
    }

    if (current.isObject()) {
      current = current.children.find((c) => c.name === segment);
    } else if (current.isArray()) {
      const idx = Number.parseInt(segment, 10);
      current = current.at(idx);
    }
  }

  return current?.isPrimitive() ? current.value : current?.getPlainValue();
}

function setValue(root: ValueNode, path: string, value: unknown): void {
  const segments = path.split(/[.[\]]+/).filter(Boolean);
  let current: ValueNode | undefined = root;

  for (let i = 0; i < segments.length - 1; i++) {
    const segment = segments[i]!;

    if (!current) {
      return;
    }

    if (current.isObject()) {
      current = current.children.find((c) => c.name === segment);
    } else if (current.isArray()) {
      const idx = Number.parseInt(segment, 10);
      current = current.at(idx);
    }
  }

  const lastSegment = segments[segments.length - 1]!;

  if (current?.isObject()) {
    const node = current.children.find((c) => c.name === lastSegment);
    if (node?.isPrimitive()) {
      node.setValue(value, { internal: true });
    }
  } else if (current?.isArray()) {
    const idx = Number.parseInt(lastSegment, 10);
    const node = current.at(idx);
    if (node?.isPrimitive()) {
      node.setValue(value, { internal: true });
    }
  }
}

beforeEach(() => {
  resetNodeIdCounter();
});

describe('FormulaEngine', () => {
  describe('initialization', () => {
    it('evaluates formulas on initialization', () => {
      const schema = obj({
        price: num(),
        quantity: num(),
        total: num({ readOnly: true, formula: 'price * quantity' }),
      });

      const root = createTree(schema, { price: 100, quantity: 5, total: 0 });
      const treeRoot = createTreeRoot(root);
      const engine = new FormulaEngine(treeRoot);

      expect(getValue(root, 'total')).toBe(500);

      engine.dispose();
    });

    it('evaluates chain of dependent formulas', () => {
      const schema = obj({
        price: num(),
        subtotal: num({ readOnly: true, formula: 'price * 2' }),
        total: num({ readOnly: true, formula: 'subtotal + 10' }),
      });

      const root = createTree(schema, { price: 100, subtotal: 0, total: 0 });
      const treeRoot = createTreeRoot(root);
      const engine = new FormulaEngine(treeRoot);

      expect(getValue(root, 'subtotal')).toBe(200);
      expect(getValue(root, 'total')).toBe(210);

      engine.dispose();
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
      const engine = new FormulaEngine(treeRoot);

      expect(getValue(root, 'items[0].total')).toBe(200);
      expect(getValue(root, 'items[1].total')).toBe(150);

      engine.dispose();
    });
  });

  describe('nested objects', () => {
    it('evaluates formula referencing nested fields', () => {
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
      const engine = new FormulaEngine(treeRoot);

      expect(getValue(root, 'total')).toBe(500);

      engine.dispose();
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
      const engine = new FormulaEngine(treeRoot);

      expect(getValue(root, 'order.subtotal')).toBe(200);

      engine.dispose();
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
      const engine = new FormulaEngine(treeRoot);

      const resultNode = root.isObject()
        ? root.children.find((c) => c.name === 'result')
        : null;

      expect(resultNode?.isPrimitive()).toBe(true);
      if (resultNode?.isPrimitive()) {
        expect(resultNode.formulaWarning?.type).toBe('nan');
      }

      engine.dispose();
    });

    it('sets warning for Infinity result', () => {
      const schema = obj({
        a: num(),
        b: num(),
        result: num({ readOnly: true, formula: 'a / b' }),
      });

      const root = createTree(schema, { a: 1, b: 0, result: 0 });
      const treeRoot = createTreeRoot(root);
      const engine = new FormulaEngine(treeRoot);

      const resultNode = root.isObject()
        ? root.children.find((c) => c.name === 'result')
        : null;

      expect(resultNode?.isPrimitive()).toBe(true);
      if (resultNode?.isPrimitive()) {
        expect(resultNode.formulaWarning?.type).toBe('infinity');
      }

      engine.dispose();
    });
  });

  describe('getFormulas', () => {
    it('returns collected formulas', () => {
      const schema = obj({
        a: num(),
        b: num({ readOnly: true, formula: 'a * 2' }),
        c: num({ readOnly: true, formula: 'b + 1' }),
      });

      const root = createTree(schema, { a: 5, b: 0, c: 0 });
      const treeRoot = createTreeRoot(root);
      const engine = new FormulaEngine(treeRoot);

      const formulas = engine.getFormulas();
      expect(formulas.length).toBe(2);

      engine.dispose();
    });
  });

  describe('getEvaluationOrder', () => {
    it('returns formulas in topological order', () => {
      const schema = obj({
        a: num(),
        b: num({ readOnly: true, formula: 'a * 2' }),
        c: num({ readOnly: true, formula: 'b + 1' }),
      });

      const root = createTree(schema, { a: 5, b: 0, c: 0 });
      const treeRoot = createTreeRoot(root);
      const engine = new FormulaEngine(treeRoot);

      const order = engine.getEvaluationOrder();
      const bIndex = order.findIndex((f) => f.node.name === 'b');
      const cIndex = order.findIndex((f) => f.node.name === 'c');

      expect(bIndex).toBeLessThan(cIndex);

      engine.dispose();
    });
  });

  describe('dispose', () => {
    it('clears internal state on dispose', () => {
      const schema = obj({
        a: num(),
        b: num({ readOnly: true, formula: 'a * 2' }),
      });

      const root = createTree(schema, { a: 10, b: 0 });
      const treeRoot = createTreeRoot(root);
      const engine = new FormulaEngine(treeRoot);

      expect(engine.getFormulas().length).toBe(1);

      engine.dispose();

      expect(engine.getFormulas().length).toBe(0);
      expect(engine.getEvaluationOrder().length).toBe(0);
    });
  });

  describe('reinitialize', () => {
    it('reinitializes and re-evaluates all formulas', () => {
      const schema = obj({
        a: num(),
        b: num({ readOnly: true, formula: 'a * 2' }),
      });

      const root = createTree(schema, { a: 10, b: 0 });
      const treeRoot = createTreeRoot(root);
      const engine = new FormulaEngine(treeRoot);

      expect(getValue(root, 'b')).toBe(20);

      setValue(root, 'a', 50);

      engine.reinitialize();

      expect(getValue(root, 'b')).toBe(100);

      engine.dispose();
    });

    it('recalculates formulas after value change', () => {
      const schema = obj({
        a: num(),
        b: num({ readOnly: true, formula: 'a * 2' }),
      });

      const root = createTree(schema, { a: 5, b: 0 });
      const treeRoot = createTreeRoot(root);
      const engine = new FormulaEngine(treeRoot);

      expect(getValue(root, 'b')).toBe(10);

      setValue(root, 'a', 20);
      engine.reinitialize();

      expect(getValue(root, 'b')).toBe(40);

      engine.dispose();
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
      const engine = new FormulaEngine(treeRoot);

      expect(getValue(root, 'fullName')).toBe('John Doe');

      engine.dispose();
    });
  });

  describe('long chains', () => {
    it('evaluates long chain A -> B -> C -> D -> E', () => {
      const schema = obj({
        a: num(),
        b: num({ readOnly: true, formula: 'a * 2' }),
        c: num({ readOnly: true, formula: 'b + 1' }),
        d: num({ readOnly: true, formula: 'c * 2' }),
        e: num({ readOnly: true, formula: 'd + 100' }),
      });

      const root = createTree(schema, { a: 1, b: 0, c: 0, d: 0, e: 0 });
      const treeRoot = createTreeRoot(root);
      const engine = new FormulaEngine(treeRoot);

      expect(getValue(root, 'b')).toBe(2);
      expect(getValue(root, 'c')).toBe(3);
      expect(getValue(root, 'd')).toBe(6);
      expect(getValue(root, 'e')).toBe(106);

      engine.dispose();
    });
  });
});
