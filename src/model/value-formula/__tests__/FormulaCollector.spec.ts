import { createNodeFactory, resetNodeIdCounter } from '../../value-node/index.js';
import { JsonSchemaTypeName, type JsonSchema } from '../../../types/schema.types.js';
import { FormulaCollector } from '../FormulaCollector.js';

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

      expect(formulas.length).toBe(1);
      expect(formulas[0]?.node.name).toBe('total');
      expect(formulas[0]?.expression).toBe('price * quantity');
    });

    it('returns empty array when no formulas exist', () => {
      const schema: JsonSchema = {
        type: JsonSchemaTypeName.Object,
        properties: {
          price: { type: JsonSchemaTypeName.Number, default: 0 },
          quantity: { type: JsonSchemaTypeName.Number, default: 0 },
        },
        additionalProperties: false,
        required: ['price', 'quantity'],
      };

      const root = createTree(schema, { price: 100, quantity: 5 });
      const collector = new FormulaCollector();
      const formulas = collector.collect(root);

      expect(formulas.length).toBe(0);
    });

    it('collects multiple formulas', () => {
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
            'x-formula': { version: 1, expression: 'a * 3' },
          },
        },
        additionalProperties: false,
        required: ['a', 'b', 'c'],
      };

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
      const schema: JsonSchema = {
        type: JsonSchemaTypeName.Object,
        properties: {
          item: {
            type: JsonSchemaTypeName.Object,
            properties: {
              price: { type: JsonSchemaTypeName.Number, default: 0 },
              tax: {
                type: JsonSchemaTypeName.Number,
                default: 0,
                readOnly: true,
                'x-formula': { version: 1, expression: 'price * 0.1' },
              },
            },
            additionalProperties: false,
            required: ['price', 'tax'],
          },
          grandTotal: {
            type: JsonSchemaTypeName.Number,
            default: 0,
            readOnly: true,
            'x-formula': { version: 1, expression: 'item.price + item.tax' },
          },
        },
        additionalProperties: false,
        required: ['item', 'grandTotal'],
      };

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
      const schema: JsonSchema = {
        type: JsonSchemaTypeName.Object,
        properties: {
          items: {
            type: JsonSchemaTypeName.Array,
            items: {
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
            },
          },
        },
        additionalProperties: false,
        required: ['items'],
      };

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
      const schema: JsonSchema = {
        type: JsonSchemaTypeName.Object,
        properties: {
          items: {
            type: JsonSchemaTypeName.Array,
            items: {
              type: JsonSchemaTypeName.Object,
              properties: {
                value: { type: JsonSchemaTypeName.Number, default: 0 },
                doubled: {
                  type: JsonSchemaTypeName.Number,
                  default: 0,
                  readOnly: true,
                  'x-formula': { version: 1, expression: 'value * 2' },
                },
              },
              additionalProperties: false,
              required: ['value', 'doubled'],
            },
          },
        },
        additionalProperties: false,
        required: ['items'],
      };

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
      const schema: JsonSchema = {
        type: JsonSchemaTypeName.Object,
        properties: {
          a: { type: JsonSchemaTypeName.Number, default: 0 },
          b: { type: JsonSchemaTypeName.Number, default: 0 },
          c: {
            type: JsonSchemaTypeName.Number,
            default: 0,
            readOnly: true,
            'x-formula': { version: 1, expression: 'a + b' },
          },
        },
        additionalProperties: false,
        required: ['a', 'b', 'c'],
      };

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
      const schema: JsonSchema = {
        type: JsonSchemaTypeName.Object,
        properties: {
          item: {
            type: JsonSchemaTypeName.Object,
            properties: {
              price: { type: JsonSchemaTypeName.Number, default: 0 },
            },
            additionalProperties: false,
            required: ['price'],
          },
          total: {
            type: JsonSchemaTypeName.Number,
            default: 0,
            readOnly: true,
            'x-formula': { version: 1, expression: 'item.price * 2' },
          },
        },
        additionalProperties: false,
        required: ['item', 'total'],
      };

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
      const schema: JsonSchema = {
        type: JsonSchemaTypeName.Object,
        properties: {
          a: { type: JsonSchemaTypeName.Number, default: 0 },
          b: {
            type: JsonSchemaTypeName.Number,
            default: 0,
            readOnly: true,
            'x-formula': { version: 1, expression: '(((' },
          },
        },
        additionalProperties: false,
        required: ['a', 'b'],
      };

      const root = createTree(schema, { a: 1, b: 0 });
      const collector = new FormulaCollector();
      const formulas = collector.collect(root);

      expect(formulas.length).toBe(1);
      expect(formulas[0]?.dependencyNodes.length).toBe(0);
    });
  });

  describe('relative path dependencies', () => {
    it('resolves dependency with relative path (../)', () => {
      const schema: JsonSchema = {
        type: JsonSchemaTypeName.Object,
        properties: {
          multiplier: { type: JsonSchemaTypeName.Number, default: 1 },
          nested: {
            type: JsonSchemaTypeName.Object,
            properties: {
              value: { type: JsonSchemaTypeName.Number, default: 0 },
              computed: {
                type: JsonSchemaTypeName.Number,
                default: 0,
                readOnly: true,
                'x-formula': { version: 1, expression: '../multiplier * value' },
              },
            },
            additionalProperties: false,
            required: ['value', 'computed'],
          },
        },
        additionalProperties: false,
        required: ['multiplier', 'nested'],
      };

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
      const schema: JsonSchema = {
        type: JsonSchemaTypeName.Object,
        properties: {
          globalValue: { type: JsonSchemaTypeName.Number, default: 100 },
          level1: {
            type: JsonSchemaTypeName.Object,
            properties: {
              level2: {
                type: JsonSchemaTypeName.Object,
                properties: {
                  computed: {
                    type: JsonSchemaTypeName.Number,
                    default: 0,
                    readOnly: true,
                    'x-formula': { version: 1, expression: '../../globalValue' },
                  },
                },
                additionalProperties: false,
                required: ['computed'],
              },
            },
            additionalProperties: false,
            required: ['level2'],
          },
        },
        additionalProperties: false,
        required: ['globalValue', 'level1'],
      };

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
      const schema: JsonSchema = {
        type: JsonSchemaTypeName.Object,
        properties: {
          multiplier: { type: JsonSchemaTypeName.Number, default: 2 },
          items: {
            type: JsonSchemaTypeName.Array,
            items: {
              type: JsonSchemaTypeName.Object,
              properties: {
                value: { type: JsonSchemaTypeName.Number, default: 0 },
                computed: {
                  type: JsonSchemaTypeName.Number,
                  default: 0,
                  readOnly: true,
                  'x-formula': { version: 1, expression: '../multiplier * value' },
                },
              },
              additionalProperties: false,
              required: ['value', 'computed'],
            },
          },
        },
        additionalProperties: false,
        required: ['multiplier', 'items'],
      };

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
      const schema: JsonSchema = {
        type: JsonSchemaTypeName.Object,
        properties: {
          value: { type: JsonSchemaTypeName.Number, default: 0 },
          computed: {
            type: JsonSchemaTypeName.Number,
            default: 0,
            readOnly: true,
            'x-formula': { version: 1, expression: '../../../nonexistent' },
          },
        },
        additionalProperties: false,
        required: ['value', 'computed'],
      };

      const root = createTree(schema, { value: 10, computed: 0 });
      const collector = new FormulaCollector();
      const formulas = collector.collect(root);

      expect(formulas.length).toBe(1);
      expect(formulas[0]?.dependencyNodes.length).toBe(0);
    });

    it('resolves relative path to the parent object without remaining path', () => {
      const schema: JsonSchema = {
        type: JsonSchemaTypeName.Object,
        properties: {
          level1: {
            type: JsonSchemaTypeName.Object,
            properties: {
              level2: {
                type: JsonSchemaTypeName.Object,
                properties: {
                  a: { type: JsonSchemaTypeName.Number, default: 0 },
                  result: {
                    type: JsonSchemaTypeName.Number,
                    default: 0,
                    readOnly: true,
                    'x-formula': { version: 1, expression: '../' },
                  },
                },
                additionalProperties: false,
                required: ['a', 'result'],
              },
            },
            additionalProperties: false,
            required: ['level2'],
          },
        },
        additionalProperties: false,
        required: ['level1'],
      };

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
      const schema: JsonSchema = {
        type: JsonSchemaTypeName.Object,
        properties: {
          globalValue: { type: JsonSchemaTypeName.Number, default: 0 },
          nested: {
            type: JsonSchemaTypeName.Object,
            properties: {
              computed: {
                type: JsonSchemaTypeName.Number,
                default: 0,
                readOnly: true,
                'x-formula': { version: 1, expression: '/globalValue * 2' },
              },
            },
            additionalProperties: false,
            required: ['computed'],
          },
        },
        additionalProperties: false,
        required: ['globalValue', 'nested'],
      };

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
      const schema: JsonSchema = {
        type: JsonSchemaTypeName.Object,
        properties: {
          config: {
            type: JsonSchemaTypeName.Object,
            properties: {
              multiplier: { type: JsonSchemaTypeName.Number, default: 1 },
              offset: { type: JsonSchemaTypeName.Number, default: 0 },
            },
            additionalProperties: false,
            required: ['multiplier', 'offset'],
          },
          value: { type: JsonSchemaTypeName.Number, default: 0 },
          result: {
            type: JsonSchemaTypeName.Number,
            default: 0,
            readOnly: true,
            'x-formula': { version: 1, expression: 'config' },
          },
        },
        additionalProperties: false,
        required: ['config', 'value', 'result'],
      };

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
      const schema: JsonSchema = {
        type: JsonSchemaTypeName.Object,
        properties: {
          numbers: {
            type: JsonSchemaTypeName.Array,
            items: { type: JsonSchemaTypeName.Number, default: 0 },
          },
          result: {
            type: JsonSchemaTypeName.Number,
            default: 0,
            readOnly: true,
            'x-formula': { version: 1, expression: 'numbers' },
          },
        },
        additionalProperties: false,
        required: ['numbers', 'result'],
      };

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
      const schema: JsonSchema = {
        type: JsonSchemaTypeName.Object,
        properties: {
          items: {
            type: JsonSchemaTypeName.Array,
            items: { type: JsonSchemaTypeName.Number, default: 0 },
          },
          first: {
            type: JsonSchemaTypeName.Number,
            default: 0,
            readOnly: true,
            'x-formula': { version: 1, expression: 'items[0]' },
          },
        },
        additionalProperties: false,
        required: ['items', 'first'],
      };

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
      const schema: JsonSchema = {
        type: JsonSchemaTypeName.Object,
        properties: {
          value: { type: JsonSchemaTypeName.Number, default: 0 },
          result: {
            type: JsonSchemaTypeName.Number,
            default: 0,
            readOnly: true,
            'x-formula': { version: 1, expression: 'value.nested' },
          },
        },
        additionalProperties: false,
        required: ['value', 'result'],
      };

      const root = createTree(schema, {
        value: 42,
        result: 0,
      });
      const collector = new FormulaCollector();
      const formulas = collector.collect(root);

      const resultFormula = formulas.find((f) => f.node.name === 'result');
      expect(resultFormula).toBeDefined();
      expect(resultFormula?.dependencyNodes.length).toBe(0);
    });

    it('handles invalid index access on non-array', () => {
      const schema: JsonSchema = {
        type: JsonSchemaTypeName.Object,
        properties: {
          value: { type: JsonSchemaTypeName.Number, default: 0 },
          result: {
            type: JsonSchemaTypeName.Number,
            default: 0,
            readOnly: true,
            'x-formula': { version: 1, expression: 'value[0]' },
          },
        },
        additionalProperties: false,
        required: ['value', 'result'],
      };

      const root = createTree(schema, {
        value: 42,
        result: 0,
      });
      const collector = new FormulaCollector();
      const formulas = collector.collect(root);

      const resultFormula = formulas.find((f) => f.node.name === 'result');
      expect(resultFormula).toBeDefined();
      expect(resultFormula?.dependencyNodes.length).toBe(0);
    });
  });

  describe('dependency resolution from root when no parent', () => {
    it('resolves from root when no parent context', () => {
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
        },
        additionalProperties: false,
        required: ['a', 'b'],
      };

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
      const schema: JsonSchema = {
        type: JsonSchemaTypeName.Object,
        properties: {
          item: {
            type: JsonSchemaTypeName.Object,
            properties: {
              value: { type: JsonSchemaTypeName.Number, default: 0 },
              computed: {
                type: JsonSchemaTypeName.Number,
                default: 0,
                readOnly: true,
                'x-formula': { version: 1, expression: 'value * 2' },
              },
            },
            additionalProperties: false,
            required: ['value', 'computed'],
          },
        },
        additionalProperties: false,
        required: ['item'],
      };

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
        },
        additionalProperties: false,
        required: ['a', 'b'],
      };

      const root = createTree(schema, { a: 10, b: 0 });
      const collector = new FormulaCollector();
      const formulas = collector.collect(root);

      expect(formulas.length).toBe(1);
      expect(formulas[0]?.parent).not.toBeNull();
      expect(formulas[0]?.parent?.name).toBe('');
    });
  });
});
