import { createNodeFactory, resetNodeIdCounter } from '../../value-node/index.js';
import type { JsonSchema } from '../../../types/schema.types.js';
import { FormulaCollector } from '../FormulaCollector.js';
import { obj, num, arr } from '../../../mocks/schema.mocks.js';

function createTree(schema: JsonSchema, value: unknown) {
  const factory = createNodeFactory();
  return factory.createTree(schema, value);
}

beforeEach(() => {
  resetNodeIdCounter();
});

describe('FormulaCollector', () => {
  describe('basic collection', () => {
    it('collects formula fields from simple tree', () => {
      const schema = obj({
        price: num(),
        quantity: num(),
        total: num({ readOnly: true, formula: 'price * quantity' }),
      });

      const root = createTree(schema, { price: 100, quantity: 5, total: 0 });
      const collector = new FormulaCollector();
      const formulas = collector.collect(root);

      expect(formulas.length).toBe(1);
      expect(formulas[0]?.node.name).toBe('total');
      expect(formulas[0]?.expression).toBe('price * quantity');
    });

    it('returns empty array when no formulas exist', () => {
      const schema = obj({
        price: num(),
        quantity: num(),
      });

      const root = createTree(schema, { price: 100, quantity: 5 });
      const collector = new FormulaCollector();
      const formulas = collector.collect(root);

      expect(formulas.length).toBe(0);
    });

    it('collects multiple formulas', () => {
      const schema = obj({
        a: num(),
        b: num({ readOnly: true, formula: 'a * 2' }),
        c: num({ readOnly: true, formula: 'a * 3' }),
      });

      const root = createTree(schema, { a: 10, b: 0, c: 0 });
      const collector = new FormulaCollector();
      const formulas = collector.collect(root);

      expect(formulas.length).toBe(2);
      const names = formulas.map((f) => f.node.name);
      expect(names).toContain('b');
      expect(names).toContain('c');
    });
  });

  describe('nested structures', () => {
    it('collects formulas from nested object', () => {
      const schema = obj({
        item: obj({
          price: num(),
          tax: num({ readOnly: true, formula: 'price * 0.1' }),
        }),
        grandTotal: num({ readOnly: true, formula: 'item.price + item.tax' }),
      });

      const root = createTree(schema, {
        item: { price: 100, tax: 0 },
        grandTotal: 0,
      });
      const collector = new FormulaCollector();
      const formulas = collector.collect(root);

      expect(formulas.length).toBe(2);
      const names = formulas.map((f) => f.node.name);
      expect(names).toContain('tax');
      expect(names).toContain('grandTotal');
    });
  });

  describe('array items', () => {
    it('collects formulas from array items', () => {
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
      const collector = new FormulaCollector();
      const formulas = collector.collect(root);

      expect(formulas.length).toBe(2);
      expect(formulas.every((f) => f.node.name === 'total')).toBe(true);
      expect(formulas.every((f) => f.arrayLevels.length > 0)).toBe(true);
    });

    it('captures array levels with correct indices', () => {
      const schema = obj({
        items: arr(
          obj({
            value: num(),
            doubled: num({ readOnly: true, formula: 'value * 2' }),
          }),
        ),
      });

      const root = createTree(schema, {
        items: [
          { value: 10, doubled: 0 },
          { value: 20, doubled: 0 },
          { value: 30, doubled: 0 },
        ],
      });
      const collector = new FormulaCollector();
      const formulas = collector.collect(root);

      expect(formulas.length).toBe(3);
      expect(formulas[0]?.arrayLevels[0]?.index).toBe(0);
      expect(formulas[1]?.arrayLevels[0]?.index).toBe(1);
      expect(formulas[2]?.arrayLevels[0]?.index).toBe(2);
    });
  });

  describe('dependency resolution', () => {
    it('extracts dependencies from expression', () => {
      const schema = obj({
        a: num(),
        b: num(),
        c: num({ readOnly: true, formula: 'a + b' }),
      });

      const root = createTree(schema, { a: 1, b: 2, c: 0 });
      const collector = new FormulaCollector();
      const formulas = collector.collect(root);

      const field = formulas.find((f) => f.node.name === 'c');
      expect(field).toBeDefined();
      const depNames = field?.dependencyNodes.map((n) => n.name);
      expect(depNames).toContain('a');
      expect(depNames).toContain('b');
    });

    it('resolves nested dependency paths', () => {
      const schema = obj({
        item: obj({
          price: num(),
        }),
        total: num({ readOnly: true, formula: 'item.price * 2' }),
      });

      const root = createTree(schema, {
        item: { price: 100 },
        total: 0,
      });
      const collector = new FormulaCollector();
      const formulas = collector.collect(root);

      const field = formulas.find((f) => f.node.name === 'total');
      expect(field).toBeDefined();
      expect(field?.dependencyNodes.length).toBe(1);
      expect(field?.dependencyNodes[0]?.name).toBe('price');
    });

    it('handles invalid expressions gracefully', () => {
      const schema = obj({
        a: num(),
        b: num({ readOnly: true, formula: '(((' }),
      });

      const root = createTree(schema, { a: 1, b: 0 });
      const collector = new FormulaCollector();
      const formulas = collector.collect(root);

      expect(formulas.length).toBe(1);
      expect(formulas[0]?.dependencyNodes.length).toBe(0);
    });
  });

  describe('relative path dependencies', () => {
    it('resolves dependency with relative path (../)', () => {
      const schema = obj({
        multiplier: num({ default: 1 }),
        nested: obj({
          value: num(),
          computed: num({ readOnly: true, formula: '../multiplier * value' }),
        }),
      });

      const root = createTree(schema, {
        multiplier: 3,
        nested: { value: 10, computed: 0 },
      });
      const collector = new FormulaCollector();
      const formulas = collector.collect(root);

      expect(formulas.length).toBe(1);
      expect(formulas[0]?.dependencyNodes.length).toBe(2);
      const depNames = formulas[0]?.dependencyNodes.map((n) => n.name);
      expect(depNames).toContain('multiplier');
      expect(depNames).toContain('value');
    });

    it('resolves dependency with multiple levels up (../../)', () => {
      const schema = obj({
        globalValue: num({ default: 100 }),
        level1: obj({
          level2: obj({
            computed: num({ readOnly: true, formula: '../../globalValue' }),
          }),
        }),
      });

      const root = createTree(schema, {
        globalValue: 100,
        level1: { level2: { computed: 0 } },
      });
      const collector = new FormulaCollector();
      const formulas = collector.collect(root);

      expect(formulas.length).toBe(1);
      expect(formulas[0]?.dependencyNodes.length).toBe(1);
      expect(formulas[0]?.dependencyNodes[0]?.name).toBe('globalValue');
    });

    it('handles relative path with array parent', () => {
      const schema = obj({
        multiplier: num({ default: 2 }),
        items: arr(
          obj({
            value: num(),
            computed: num({ readOnly: true, formula: '../multiplier * value' }),
          }),
        ),
      });

      const root = createTree(schema, {
        multiplier: 2,
        items: [{ value: 5, computed: 0 }],
      });
      const collector = new FormulaCollector();
      const formulas = collector.collect(root);

      expect(formulas.length).toBe(1);
      expect(formulas[0]?.dependencyNodes.length).toBe(2);
    });

    it('returns empty dependencies when relative path goes too far up', () => {
      const schema = obj({
        value: num(),
        computed: num({ readOnly: true, formula: '../../../nonexistent' }),
      });

      const root = createTree(schema, { value: 10, computed: 0 });
      const collector = new FormulaCollector();
      const formulas = collector.collect(root);

      expect(formulas.length).toBe(1);
      expect(formulas[0]?.dependencyNodes.length).toBe(0);
    });

    it('resolves relative path to the parent object without remaining path', () => {
      const schema = obj({
        level1: obj({
          level2: obj({
            a: num(),
            result: num({ readOnly: true, formula: '../' }),
          }),
        }),
      });

      const root = createTree(schema, {
        level1: { level2: { a: 5, result: 0 } },
      });
      const collector = new FormulaCollector();
      const formulas = collector.collect(root);

      expect(formulas.length).toBe(1);
    });
  });

  describe('absolute path dependencies', () => {
    it('resolves dependency with absolute path (/root)', () => {
      const schema = obj({
        globalValue: num(),
        nested: obj({
          computed: num({ readOnly: true, formula: '/globalValue * 2' }),
        }),
      });

      const root = createTree(schema, {
        globalValue: 50,
        nested: { computed: 0 },
      });
      const collector = new FormulaCollector();
      const formulas = collector.collect(root);

      expect(formulas.length).toBe(1);
      expect(formulas[0]?.dependencyNodes.length).toBe(1);
      expect(formulas[0]?.dependencyNodes[0]?.name).toBe('globalValue');
    });
  });

  describe('object dependencies', () => {
    it('collects primitive nodes from object dependency', () => {
      const schema = obj({
        config: obj({
          multiplier: num({ default: 1 }),
          offset: num(),
        }),
        value: num(),
        result: num({ readOnly: true, formula: 'config' }),
      });

      const root = createTree(schema, {
        config: { multiplier: 2, offset: 10 },
        value: 5,
        result: 0,
      });
      const collector = new FormulaCollector();
      const formulas = collector.collect(root);

      const resultFormula = formulas.find((f) => f.node.name === 'result');
      expect(resultFormula).toBeDefined();
      expect(resultFormula?.dependencyNodes.length).toBe(2);
      const depNames = resultFormula?.dependencyNodes.map((n) => n.name);
      expect(depNames).toContain('multiplier');
      expect(depNames).toContain('offset');
    });

    it('collects primitive nodes from array dependency', () => {
      const schema = obj({
        numbers: arr(num()),
        result: num({ readOnly: true, formula: 'numbers' }),
      });

      const root = createTree(schema, {
        numbers: [1, 2, 3],
        result: 0,
      });
      const collector = new FormulaCollector();
      const formulas = collector.collect(root);

      const resultFormula = formulas.find((f) => f.node.name === 'result');
      expect(resultFormula).toBeDefined();
      expect(resultFormula?.dependencyNodes.length).toBe(3);
    });
  });

  describe('index path resolution', () => {
    it('resolves dependency with array index path', () => {
      const schema = obj({
        items: arr(num()),
        first: num({ readOnly: true, formula: 'items[0]' }),
      });

      const root = createTree(schema, {
        items: [10, 20, 30],
        first: 0,
      });
      const collector = new FormulaCollector();
      const formulas = collector.collect(root);

      const firstFormula = formulas.find((f) => f.node.name === 'first');
      expect(firstFormula).toBeDefined();
      expect(firstFormula?.dependencyNodes.length).toBe(1);
    });

    it('handles invalid property access on non-object', () => {
      const schema = obj({
        value: num(),
        result: num({ readOnly: true, formula: 'value.nested' }),
      });

      const root = createTree(schema, { value: 42, result: 0 });
      const collector = new FormulaCollector();
      const formulas = collector.collect(root);

      const resultFormula = formulas.find((f) => f.node.name === 'result');
      expect(resultFormula).toBeDefined();
      expect(resultFormula?.dependencyNodes.length).toBe(0);
    });

    it('handles invalid index access on non-array', () => {
      const schema = obj({
        value: num(),
        result: num({ readOnly: true, formula: 'value[0]' }),
      });

      const root = createTree(schema, { value: 42, result: 0 });
      const collector = new FormulaCollector();
      const formulas = collector.collect(root);

      const resultFormula = formulas.find((f) => f.node.name === 'result');
      expect(resultFormula).toBeDefined();
      expect(resultFormula?.dependencyNodes.length).toBe(0);
    });
  });

  describe('dependency resolution from root when no parent', () => {
    it('resolves from root when no parent context', () => {
      const schema = obj({
        a: num(),
        b: num({ readOnly: true, formula: 'a * 2' }),
      });

      const root = createTree(schema, { a: 5, b: 0 });
      const collector = new FormulaCollector();
      const formulas = collector.collect(root);

      expect(formulas.length).toBe(1);
      expect(formulas[0]?.dependencyNodes.length).toBe(1);
      expect(formulas[0]?.dependencyNodes[0]?.name).toBe('a');
    });
  });

  describe('parent tracking', () => {
    it('sets parent reference correctly for nested formulas', () => {
      const schema = obj({
        item: obj({
          value: num(),
          computed: num({ readOnly: true, formula: 'value * 2' }),
        }),
      });

      const root = createTree(schema, {
        item: { value: 10, computed: 0 },
      });
      const collector = new FormulaCollector();
      const formulas = collector.collect(root);

      expect(formulas.length).toBe(1);
      expect(formulas[0]?.parent).not.toBeNull();
      expect(formulas[0]?.parent?.name).toBe('item');
    });

    it('sets parent to null for root-level formulas in object', () => {
      const schema = obj({
        a: num(),
        b: num({ readOnly: true, formula: 'a * 2' }),
      });

      const root = createTree(schema, { a: 10, b: 0 });
      const collector = new FormulaCollector();
      const formulas = collector.collect(root);

      expect(formulas.length).toBe(1);
      expect(formulas[0]?.parent).not.toBeNull();
      expect(formulas[0]?.parent?.name).toBe('');
    });
  });
});
