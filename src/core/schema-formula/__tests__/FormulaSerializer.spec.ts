import type { JsonObjectSchema } from '../../../types/index.js';
import { createSchemaTree } from '../../schema-tree/index.js';
import { SchemaParser } from '../../../model/schema-model/SchemaParser.js';
import { ParsedFormula } from '../../../model/schema-formula/parsing/index.js';
import { FormulaSerializer } from '../serialization/index.js';
import { obj, str, num, bool, arr } from '../../../mocks/schema.mocks.js';

const createTree = (schema: JsonObjectSchema) => {
  const parser = new SchemaParser();
  const root = parser.parse(schema);
  return createSchemaTree(root);
};

describe('FormulaSerializer', () => {
  describe('toXFormula', () => {
    it('converts formula to XFormula format', () => {
      const schema = obj({
        a: num(),
        b: num(),
        sum: num(),
      });

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
        const schema = obj({
          value: num(),
        });

        const tree = createTree(schema);
        const valueNode = tree.root().property('value');
        const formula = new ParsedFormula(tree, valueNode.id(), '42');

        const serializer = new FormulaSerializer(tree, valueNode.id(), formula);
        expect(serializer.serialize()).toBe('42');
      });

      it('serializes negative number literals', () => {
        const schema = obj({
          value: num(),
        });

        const tree = createTree(schema);
        const valueNode = tree.root().property('value');
        const formula = new ParsedFormula(tree, valueNode.id(), '-10');

        const serializer = new FormulaSerializer(tree, valueNode.id(), formula);
        expect(serializer.serialize()).toBe('-10');
      });

      it('serializes string literals', () => {
        const schema = obj({
          value: str(),
        });

        const tree = createTree(schema);
        const valueNode = tree.root().property('value');
        const formula = new ParsedFormula(tree, valueNode.id(), '"hello"');

        const serializer = new FormulaSerializer(tree, valueNode.id(), formula);
        expect(serializer.serialize()).toBe('"hello"');
      });

      it('serializes boolean true', () => {
        const schema = obj({
          value: bool(),
        });

        const tree = createTree(schema);
        const valueNode = tree.root().property('value');
        const formula = new ParsedFormula(tree, valueNode.id(), 'true');

        const serializer = new FormulaSerializer(tree, valueNode.id(), formula);
        expect(serializer.serialize()).toBe('true');
      });

      it('serializes null', () => {
        const schema = obj({
          value: num(),
        });

        const tree = createTree(schema);
        const valueNode = tree.root().property('value');
        const formula = new ParsedFormula(tree, valueNode.id(), 'null');

        const serializer = new FormulaSerializer(tree, valueNode.id(), formula);
        expect(serializer.serialize()).toBe('null');
      });
    });

    describe('binary operations', () => {
      const createMathSchema = () =>
        obj({
          a: num(),
          b: num(),
          sum: num(),
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
        const schema = obj({
          a: num(),
          b: num(),
        });

        const tree = createTree(schema);
        const bNode = tree.root().property('b');
        const formula = new ParsedFormula(tree, bNode.id(), '-a');

        const serializer = new FormulaSerializer(tree, bNode.id(), formula);
        expect(serializer.serialize()).toBe('-a');
      });

      it('serializes logical not', () => {
        const schema = obj({
          flag: bool(),
          result: bool(),
        });

        const tree = createTree(schema);
        const resultNode = tree.root().property('result');
        const formula = new ParsedFormula(tree, resultNode.id(), '!flag');

        const serializer = new FormulaSerializer(tree, resultNode.id(), formula);
        expect(serializer.serialize()).toBe('!flag');
      });
    });

    describe('ternary operations', () => {
      it('serializes ternary operator', () => {
        const schema = obj({
          flag: bool(),
          result: num(),
        });

        const tree = createTree(schema);
        const resultNode = tree.root().property('result');
        const formula = new ParsedFormula(tree, resultNode.id(), 'flag ? 1 : 0');

        const serializer = new FormulaSerializer(tree, resultNode.id(), formula);
        expect(serializer.serialize()).toBe('flag ? 1 : 0');
      });
    });

    describe('function calls', () => {
      it('serializes function with arguments', () => {
        const schema = obj({
          a: num(),
          b: num(),
          result: num(),
        });

        const tree = createTree(schema);
        const resultNode = tree.root().property('result');
        const formula = new ParsedFormula(tree, resultNode.id(), 'MAX(a, b)');

        const serializer = new FormulaSerializer(tree, resultNode.id(), formula);
        expect(serializer.serialize()).toBe('MAX(a, b)');
      });
    });

    describe('identifiers and paths', () => {
      it('serializes simple identifier', () => {
        const schema = obj({
          a: num(),
          b: num(),
        });

        const tree = createTree(schema);
        const bNode = tree.root().property('b');
        const formula = new ParsedFormula(tree, bNode.id(), 'a');

        const serializer = new FormulaSerializer(tree, bNode.id(), formula);
        expect(serializer.serialize()).toBe('a');
      });

      it('serializes member expression', () => {
        const schema = obj({
          nested: obj({
            value: num(),
          }),
          result: num(),
        });

        const tree = createTree(schema);
        const resultNode = tree.root().property('result');
        const formula = new ParsedFormula(tree, resultNode.id(), 'nested.value');

        const serializer = new FormulaSerializer(tree, resultNode.id(), formula);
        expect(serializer.serialize()).toBe('nested.value');
      });
    });

    describe('array access', () => {
      it('serializes wildcard expression', () => {
        const schema = obj({
          items: arr(num()),
          result: num(),
        });

        const tree = createTree(schema);
        const resultNode = tree.root().property('result');
        const formula = new ParsedFormula(tree, resultNode.id(), 'items[*]');

        const serializer = new FormulaSerializer(tree, resultNode.id(), formula);
        expect(serializer.serialize()).toBe('items[*]');
      });

      it('serializes formula referencing sibling fields in array item object', () => {
        const schema = obj({
          items: arr(
            obj({
              price: num(),
              quantity: num(),
              total: num(),
            }),
          ),
        });

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
