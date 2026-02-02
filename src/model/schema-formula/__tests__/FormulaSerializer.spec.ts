import type { JsonObjectSchema } from '../../../types/index.js';
import { JsonSchemaTypeName } from '../../../types/index.js';
import { createSchemaTree } from '../../../core/schema-tree/index.js';
import { SchemaParser } from '../../schema-model/SchemaParser.js';
import { ParsedFormula } from '../parsing/index.js';
import { FormulaSerializer } from '../serialization/index.js';

const createTree = (schema: JsonObjectSchema) => {
  const parser = new SchemaParser();
  const root = parser.parse(schema);
  return createSchemaTree(root);
};

describe('FormulaSerializer', () => {
  describe('toXFormula', () => {
    it('converts formula to XFormula format', () => {
      const schema: JsonObjectSchema = {
        type: JsonSchemaTypeName.Object,
        additionalProperties: false,
        required: ['a', 'b', 'sum'],
        properties: {
          a: { type: JsonSchemaTypeName.Number, default: 0 },
          b: { type: JsonSchemaTypeName.Number, default: 0 },
          sum: { type: JsonSchemaTypeName.Number, default: 0 },
        },
      };

      const tree = createTree(schema);
      const sumNode = tree.root().property('sum');
      const formula = new ParsedFormula(tree, sumNode.id(), 'a + b');

      const xFormula = FormulaSerializer.toXFormula(tree, sumNode.id(), formula);

      expect(xFormula).toEqual({
        version: 1,
        expression: 'a + b',
      });
    });
  });

  describe('serialize', () => {
    describe('literals', () => {
      it('serializes number literals', () => {
        const schema: JsonObjectSchema = {
          type: JsonSchemaTypeName.Object,
          additionalProperties: false,
          required: ['value'],
          properties: {
            value: { type: JsonSchemaTypeName.Number, default: 0 },
          },
        };

        const tree = createTree(schema);
        const valueNode = tree.root().property('value');
        const formula = new ParsedFormula(tree, valueNode.id(), '42');

        const serializer = new FormulaSerializer(tree, valueNode.id(), formula);
        expect(serializer.serialize()).toBe('42');
      });

      it('serializes negative number literals', () => {
        const schema: JsonObjectSchema = {
          type: JsonSchemaTypeName.Object,
          additionalProperties: false,
          required: ['value'],
          properties: {
            value: { type: JsonSchemaTypeName.Number, default: 0 },
          },
        };

        const tree = createTree(schema);
        const valueNode = tree.root().property('value');
        const formula = new ParsedFormula(tree, valueNode.id(), '-10');

        const serializer = new FormulaSerializer(tree, valueNode.id(), formula);
        expect(serializer.serialize()).toBe('-10');
      });

      it('serializes string literals', () => {
        const schema: JsonObjectSchema = {
          type: JsonSchemaTypeName.Object,
          additionalProperties: false,
          required: ['value'],
          properties: {
            value: { type: JsonSchemaTypeName.String, default: '' },
          },
        };

        const tree = createTree(schema);
        const valueNode = tree.root().property('value');
        const formula = new ParsedFormula(tree, valueNode.id(), '"hello"');

        const serializer = new FormulaSerializer(tree, valueNode.id(), formula);
        expect(serializer.serialize()).toBe('"hello"');
      });

      it('serializes boolean true', () => {
        const schema: JsonObjectSchema = {
          type: JsonSchemaTypeName.Object,
          additionalProperties: false,
          required: ['value'],
          properties: {
            value: { type: JsonSchemaTypeName.Boolean, default: false },
          },
        };

        const tree = createTree(schema);
        const valueNode = tree.root().property('value');
        const formula = new ParsedFormula(tree, valueNode.id(), 'true');

        const serializer = new FormulaSerializer(tree, valueNode.id(), formula);
        expect(serializer.serialize()).toBe('true');
      });

      it('serializes null', () => {
        const schema: JsonObjectSchema = {
          type: JsonSchemaTypeName.Object,
          additionalProperties: false,
          required: ['value'],
          properties: {
            value: { type: JsonSchemaTypeName.Number, default: 0 },
          },
        };

        const tree = createTree(schema);
        const valueNode = tree.root().property('value');
        const formula = new ParsedFormula(tree, valueNode.id(), 'null');

        const serializer = new FormulaSerializer(tree, valueNode.id(), formula);
        expect(serializer.serialize()).toBe('null');
      });
    });

    describe('binary operations', () => {
      const createMathSchema = (): JsonObjectSchema => ({
        type: JsonSchemaTypeName.Object,
        additionalProperties: false,
        required: ['a', 'b', 'sum'],
        properties: {
          a: { type: JsonSchemaTypeName.Number, default: 0 },
          b: { type: JsonSchemaTypeName.Number, default: 0 },
          sum: { type: JsonSchemaTypeName.Number, default: 0 },
        },
      });

      it('serializes addition', () => {
        const tree = createTree(createMathSchema());
        const sumNode = tree.root().property('sum');
        const formula = new ParsedFormula(tree, sumNode.id(), 'a + b');

        const serializer = new FormulaSerializer(tree, sumNode.id(), formula);
        expect(serializer.serialize()).toBe('a + b');
      });

      it('serializes subtraction', () => {
        const tree = createTree(createMathSchema());
        const sumNode = tree.root().property('sum');
        const formula = new ParsedFormula(tree, sumNode.id(), 'a - b');

        const serializer = new FormulaSerializer(tree, sumNode.id(), formula);
        expect(serializer.serialize()).toBe('a - b');
      });

      it('serializes multiplication', () => {
        const tree = createTree(createMathSchema());
        const sumNode = tree.root().property('sum');
        const formula = new ParsedFormula(tree, sumNode.id(), 'a * b');

        const serializer = new FormulaSerializer(tree, sumNode.id(), formula);
        expect(serializer.serialize()).toBe('a * b');
      });

      it('serializes division', () => {
        const tree = createTree(createMathSchema());
        const sumNode = tree.root().property('sum');
        const formula = new ParsedFormula(tree, sumNode.id(), 'a / b');

        const serializer = new FormulaSerializer(tree, sumNode.id(), formula);
        expect(serializer.serialize()).toBe('a / b');
      });

      it('serializes comparison operators', () => {
        const tree = createTree(createMathSchema());
        const sumNode = tree.root().property('sum');
        const formula = new ParsedFormula(tree, sumNode.id(), 'a > b');

        const serializer = new FormulaSerializer(tree, sumNode.id(), formula);
        expect(serializer.serialize()).toBe('a > b');
      });

      it('serializes nested binary ops with parentheses', () => {
        const tree = createTree(createMathSchema());
        const sumNode = tree.root().property('sum');
        const formula = new ParsedFormula(tree, sumNode.id(), '(a + b) * 2');

        const serializer = new FormulaSerializer(tree, sumNode.id(), formula);
        expect(serializer.serialize()).toBe('(a + b) * 2');
      });
    });

    describe('unary operations', () => {
      it('serializes negation', () => {
        const schema: JsonObjectSchema = {
          type: JsonSchemaTypeName.Object,
          additionalProperties: false,
          required: ['a', 'b'],
          properties: {
            a: { type: JsonSchemaTypeName.Number, default: 0 },
            b: { type: JsonSchemaTypeName.Number, default: 0 },
          },
        };

        const tree = createTree(schema);
        const bNode = tree.root().property('b');
        const formula = new ParsedFormula(tree, bNode.id(), '-a');

        const serializer = new FormulaSerializer(tree, bNode.id(), formula);
        expect(serializer.serialize()).toBe('-a');
      });

      it('serializes logical not', () => {
        const schema: JsonObjectSchema = {
          type: JsonSchemaTypeName.Object,
          additionalProperties: false,
          required: ['flag', 'result'],
          properties: {
            flag: { type: JsonSchemaTypeName.Boolean, default: false },
            result: { type: JsonSchemaTypeName.Boolean, default: false },
          },
        };

        const tree = createTree(schema);
        const resultNode = tree.root().property('result');
        const formula = new ParsedFormula(tree, resultNode.id(), '!flag');

        const serializer = new FormulaSerializer(tree, resultNode.id(), formula);
        expect(serializer.serialize()).toBe('!flag');
      });
    });

    describe('ternary operations', () => {
      it('serializes ternary operator', () => {
        const schema: JsonObjectSchema = {
          type: JsonSchemaTypeName.Object,
          additionalProperties: false,
          required: ['flag', 'result'],
          properties: {
            flag: { type: JsonSchemaTypeName.Boolean, default: false },
            result: { type: JsonSchemaTypeName.Number, default: 0 },
          },
        };

        const tree = createTree(schema);
        const resultNode = tree.root().property('result');
        const formula = new ParsedFormula(tree, resultNode.id(), 'flag ? 1 : 0');

        const serializer = new FormulaSerializer(tree, resultNode.id(), formula);
        expect(serializer.serialize()).toBe('flag ? 1 : 0');
      });
    });

    describe('function calls', () => {
      it('serializes function with arguments', () => {
        const schema: JsonObjectSchema = {
          type: JsonSchemaTypeName.Object,
          additionalProperties: false,
          required: ['a', 'b', 'result'],
          properties: {
            a: { type: JsonSchemaTypeName.Number, default: 0 },
            b: { type: JsonSchemaTypeName.Number, default: 0 },
            result: { type: JsonSchemaTypeName.Number, default: 0 },
          },
        };

        const tree = createTree(schema);
        const resultNode = tree.root().property('result');
        const formula = new ParsedFormula(tree, resultNode.id(), 'MAX(a, b)');

        const serializer = new FormulaSerializer(tree, resultNode.id(), formula);
        expect(serializer.serialize()).toBe('MAX(a, b)');
      });
    });

    describe('identifiers and paths', () => {
      it('serializes simple identifier', () => {
        const schema: JsonObjectSchema = {
          type: JsonSchemaTypeName.Object,
          additionalProperties: false,
          required: ['a', 'b'],
          properties: {
            a: { type: JsonSchemaTypeName.Number, default: 0 },
            b: { type: JsonSchemaTypeName.Number, default: 0 },
          },
        };

        const tree = createTree(schema);
        const bNode = tree.root().property('b');
        const formula = new ParsedFormula(tree, bNode.id(), 'a');

        const serializer = new FormulaSerializer(tree, bNode.id(), formula);
        expect(serializer.serialize()).toBe('a');
      });

      it('serializes member expression', () => {
        const schema: JsonObjectSchema = {
          type: JsonSchemaTypeName.Object,
          additionalProperties: false,
          required: ['nested', 'result'],
          properties: {
            nested: {
              type: JsonSchemaTypeName.Object,
              additionalProperties: false,
              required: ['value'],
              properties: {
                value: { type: JsonSchemaTypeName.Number, default: 0 },
              },
            },
            result: { type: JsonSchemaTypeName.Number, default: 0 },
          },
        };

        const tree = createTree(schema);
        const resultNode = tree.root().property('result');
        const formula = new ParsedFormula(tree, resultNode.id(), 'nested.value');

        const serializer = new FormulaSerializer(tree, resultNode.id(), formula);
        expect(serializer.serialize()).toBe('nested.value');
      });
    });

    describe('array access', () => {
      it('serializes wildcard expression', () => {
        const schema: JsonObjectSchema = {
          type: JsonSchemaTypeName.Object,
          additionalProperties: false,
          required: ['items', 'result'],
          properties: {
            items: {
              type: JsonSchemaTypeName.Array,
              items: { type: JsonSchemaTypeName.Number, default: 0 },
            },
            result: { type: JsonSchemaTypeName.Number, default: 0 },
          },
        };

        const tree = createTree(schema);
        const resultNode = tree.root().property('result');
        const formula = new ParsedFormula(tree, resultNode.id(), 'items[*]');

        const serializer = new FormulaSerializer(tree, resultNode.id(), formula);
        expect(serializer.serialize()).toBe('items[*]');
      });

      it('serializes formula referencing sibling fields in array item object', () => {
        const schema: JsonObjectSchema = {
          type: JsonSchemaTypeName.Object,
          additionalProperties: false,
          required: ['items'],
          properties: {
            items: {
              type: JsonSchemaTypeName.Array,
              items: {
                type: JsonSchemaTypeName.Object,
                additionalProperties: false,
                required: ['price', 'quantity', 'total'],
                properties: {
                  price: { type: JsonSchemaTypeName.Number, default: 0 },
                  quantity: { type: JsonSchemaTypeName.Number, default: 0 },
                  total: { type: JsonSchemaTypeName.Number, default: 0 },
                },
              },
            },
          },
        };

        const tree = createTree(schema);
        const itemsNode = tree.root().property('items');
        const itemNode = itemsNode.items();
        const totalNode = itemNode.property('total');

        const formula = new ParsedFormula(tree, totalNode.id(), 'price * quantity');

        const serializer = new FormulaSerializer(tree, totalNode.id(), formula);
        expect(serializer.serialize()).toBe('price * quantity');
      });
    });
  });
});
