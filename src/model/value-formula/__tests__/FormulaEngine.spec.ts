import {
  createNodeFactory,
  resetNodeIdCounter,
  type ValueNode,
} from '../../value-node/index.js';
import { JsonSchemaTypeName, type JsonSchema } from '../../../types/schema.types.js';
import { FormulaEngine } from '../FormulaEngine.js';
import type { ValueTreeRoot } from '../types.js';
import type { ReactivityAdapter } from '../../../core/reactivity/types.js';

function createTree(schema: JsonSchema, value: unknown): ValueNode {
  const factory = createNodeFactory();
  return factory.createTree(schema, value);
}

interface MockReactivity extends ReactivityAdapter {
  reactionCallbacks: Array<{ expression: () => unknown; effect: (value: unknown) => void }>;
  triggerAllReactions: () => void;
  triggerReactionAt: (index: number) => void;
}

function createMockReactivity(): MockReactivity {
  const reactionCallbacks: Array<{ expression: () => unknown; effect: (value: unknown) => void }> = [];

  return {
    reactionCallbacks,
    makeObservable: () => {},
    observableArray: <T>(): T[] => [],
    observableMap: <K, V>(): Map<K, V> => new Map(),
    reaction: <T>(
      expression: () => T,
      effect: (value: T) => void,
    ): (() => void) => {
      const entry = { expression: expression as () => unknown, effect: effect as (value: unknown) => void };
      reactionCallbacks.push(entry);
      return () => {
        const index = reactionCallbacks.indexOf(entry);
        if (index >= 0) {
          reactionCallbacks.splice(index, 1);
        }
      };
    },
    runInAction: <T>(fn: () => T): T => fn(),
    triggerAllReactions: (): void => {
      for (const { expression, effect } of reactionCallbacks) {
        effect(expression());
      }
    },
    triggerReactionAt: (index: number): void => {
      const entry = reactionCallbacks[index];
      if (entry) {
        entry.effect(entry.expression());
      }
    },
  };
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
      const treeRoot = createTreeRoot(root);
      const engine = new FormulaEngine(treeRoot);

      expect(getValue(root, 'total')).toBe(500);

      engine.dispose();
    });

    it('evaluates chain of dependent formulas', () => {
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
      const treeRoot = createTreeRoot(root);
      const engine = new FormulaEngine(treeRoot);

      expect(getValue(root, 'subtotal')).toBe(200);
      expect(getValue(root, 'total')).toBe(210);

      engine.dispose();
    });
  });

  describe('array formulas', () => {
    it('evaluates formulas in array items', () => {
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
      const treeRoot = createTreeRoot(root);
      const engine = new FormulaEngine(treeRoot);

      expect(getValue(root, 'items[0].total')).toBe(200);
      expect(getValue(root, 'items[1].total')).toBe(150);

      engine.dispose();
    });
  });

  describe('nested objects', () => {
    it('evaluates formula referencing nested fields', () => {
      const schema: JsonSchema = {
        type: JsonSchemaTypeName.Object,
        properties: {
          item: {
            type: JsonSchemaTypeName.Object,
            properties: {
              price: { type: JsonSchemaTypeName.Number, default: 0 },
              quantity: { type: JsonSchemaTypeName.Number, default: 0 },
            },
            additionalProperties: false,
            required: ['price', 'quantity'],
          },
          total: {
            type: JsonSchemaTypeName.Number,
            default: 0,
            readOnly: true,
            'x-formula': { version: 1, expression: 'item.price * item.quantity' },
          },
        },
        additionalProperties: false,
        required: ['item', 'total'],
      };

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
      const schema: JsonSchema = {
        type: JsonSchemaTypeName.Object,
        properties: {
          order: {
            type: JsonSchemaTypeName.Object,
            properties: {
              price: { type: JsonSchemaTypeName.Number, default: 0 },
              quantity: { type: JsonSchemaTypeName.Number, default: 0 },
              subtotal: {
                type: JsonSchemaTypeName.Number,
                default: 0,
                readOnly: true,
                'x-formula': { version: 1, expression: 'price * quantity' },
              },
            },
            additionalProperties: false,
            required: ['price', 'quantity', 'subtotal'],
          },
        },
        additionalProperties: false,
        required: ['order'],
      };

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
      const schema: JsonSchema = {
        type: JsonSchemaTypeName.Object,
        properties: {
          a: { type: JsonSchemaTypeName.Number, default: 0 },
          b: { type: JsonSchemaTypeName.Number, default: 0 },
          result: {
            type: JsonSchemaTypeName.Number,
            default: 0,
            readOnly: true,
            'x-formula': { version: 1, expression: 'a / b' },
          },
        },
        additionalProperties: false,
        required: ['a', 'b', 'result'],
      };

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
      const schema: JsonSchema = {
        type: JsonSchemaTypeName.Object,
        properties: {
          a: { type: JsonSchemaTypeName.Number, default: 0 },
          b: { type: JsonSchemaTypeName.Number, default: 0 },
          result: {
            type: JsonSchemaTypeName.Number,
            default: 0,
            readOnly: true,
            'x-formula': { version: 1, expression: 'a / b' },
          },
        },
        additionalProperties: false,
        required: ['a', 'b', 'result'],
      };

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
        },
        additionalProperties: false,
        required: ['a', 'b', 'c'],
      };

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
        },
        additionalProperties: false,
        required: ['a', 'b', 'c'],
      };

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
      const treeRoot = createTreeRoot(root);
      const engine = new FormulaEngine(treeRoot);

      expect(getValue(root, 'b')).toBe(20);

      setValue(root, 'a', 50);

      engine.reinitialize();

      expect(getValue(root, 'b')).toBe(100);

      engine.dispose();
    });
  });

  describe('string formulas', () => {
    it('evaluates string concatenation', () => {
      const schema: JsonSchema = {
        type: JsonSchemaTypeName.Object,
        properties: {
          firstName: { type: JsonSchemaTypeName.String, default: '' },
          lastName: { type: JsonSchemaTypeName.String, default: '' },
          fullName: {
            type: JsonSchemaTypeName.String,
            default: '',
            readOnly: true,
            'x-formula': { version: 1, expression: 'firstName + " " + lastName' },
          },
        },
        additionalProperties: false,
        required: ['firstName', 'lastName', 'fullName'],
      };

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
            'x-formula': { version: 1, expression: 'c * 2' },
          },
          e: {
            type: JsonSchemaTypeName.Number,
            default: 0,
            readOnly: true,
            'x-formula': { version: 1, expression: 'd + 100' },
          },
        },
        additionalProperties: false,
        required: ['a', 'b', 'c', 'd', 'e'],
      };

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

  describe('with reactivity', () => {
    it('evaluates formulas with reactivity adapter', () => {
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

      const root = createTree(schema, { price: 10, quantity: 5, total: 0 });
      const treeRoot = createTreeRoot(root);
      const reactivity = createMockReactivity();
      const engine = new FormulaEngine(treeRoot, {}, reactivity);

      expect(getValue(root, 'total')).toBe(50);
      expect(reactivity.reactionCallbacks.length).toBeGreaterThan(0);

      engine.dispose();
      expect(reactivity.reactionCallbacks.length).toBe(0);
    });

    it('sets up reactions for dependency changes', () => {
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
      const treeRoot = createTreeRoot(root);
      const reactivity = createMockReactivity();
      const engine = new FormulaEngine(treeRoot, {}, reactivity);

      expect(getValue(root, 'b')).toBe(20);
      expect(reactivity.reactionCallbacks.length).toBe(1);

      engine.dispose();
    });

    it('sets up array reactions for array structures', () => {
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
          { value: 5, doubled: 0 },
          { value: 10, doubled: 0 },
        ],
      });
      const treeRoot = createTreeRoot(root);
      const reactivity = createMockReactivity();
      const engine = new FormulaEngine(treeRoot, {}, reactivity);

      expect(getValue(root, 'items[0].doubled')).toBe(10);
      expect(getValue(root, 'items[1].doubled')).toBe(20);

      engine.dispose();
    });

    it('disposes reactions on reinitialize', () => {
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
      const treeRoot = createTreeRoot(root);
      const reactivity = createMockReactivity();
      const engine = new FormulaEngine(treeRoot, {}, reactivity);

      expect(getValue(root, 'b')).toBe(10);

      setValue(root, 'a', 20);
      engine.reinitialize();

      expect(getValue(root, 'b')).toBe(40);

      engine.dispose();
    });

    it('triggers re-evaluation when dependency changes via reaction', () => {
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
      const treeRoot = createTreeRoot(root);
      const reactivity = createMockReactivity();
      const engine = new FormulaEngine(treeRoot, {}, reactivity);

      expect(getValue(root, 'b')).toBe(20);

      setValue(root, 'a', 25);
      reactivity.triggerReactionAt(0);

      expect(getValue(root, 'b')).toBe(50);

      engine.dispose();
    });

    it('handles dependency change without reactivity', () => {
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
      const treeRoot = createTreeRoot(root);
      const engine = new FormulaEngine(treeRoot);

      expect(getValue(root, 'b')).toBe(20);

      setValue(root, 'a', 15);
      engine.reinitialize();

      expect(getValue(root, 'b')).toBe(30);

      engine.dispose();
    });

    it('handles nested array with reactivity', () => {
      const schema: JsonSchema = {
        type: JsonSchemaTypeName.Object,
        properties: {
          orders: {
            type: JsonSchemaTypeName.Array,
            items: {
              type: JsonSchemaTypeName.Object,
              properties: {
                items: {
                  type: JsonSchemaTypeName.Array,
                  items: {
                    type: JsonSchemaTypeName.Object,
                    properties: {
                      qty: { type: JsonSchemaTypeName.Number, default: 0 },
                      result: {
                        type: JsonSchemaTypeName.Number,
                        default: 0,
                        readOnly: true,
                        'x-formula': { version: 1, expression: 'qty * 10' },
                      },
                    },
                    additionalProperties: false,
                    required: ['qty', 'result'],
                  },
                },
              },
              additionalProperties: false,
              required: ['items'],
            },
          },
        },
        additionalProperties: false,
        required: ['orders'],
      };

      const root = createTree(schema, {
        orders: [
          { items: [{ qty: 1, result: 0 }] },
        ],
      });
      const treeRoot = createTreeRoot(root);
      const reactivity = createMockReactivity();
      const engine = new FormulaEngine(treeRoot, {}, reactivity);

      expect(reactivity.reactionCallbacks.length).toBeGreaterThan(0);

      engine.dispose();
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
      const treeRoot = createTreeRoot(root);
      const reactivity = createMockReactivity();
      const engine = new FormulaEngine(treeRoot, {}, reactivity);

      expect(getValue(root, 'doubled')).toBe(20);
      expect(getValue(root, 'tripled')).toBe(30);

      expect(reactivity.reactionCallbacks.length).toBe(1);

      setValue(root, 'value', 5);
      reactivity.triggerReactionAt(0);

      expect(getValue(root, 'doubled')).toBe(10);
      expect(getValue(root, 'tripled')).toBe(15);

      engine.dispose();
    });
  });
});
