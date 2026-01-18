import { JsonSchema } from '../../types/index.js';
import {
  prepareFormulas,
  evaluateFormulas,
  type PreparedFormula,
} from '../formula.js';

const createSchema = (
  fields: Record<string, { type: string; default?: unknown; formula?: string }>,
): JsonSchema =>
  ({
    type: 'object',
    properties: Object.fromEntries(
      Object.entries(fields).map(([name, config]) => [
        name,
        {
          type: config.type,
          default: config.default,
          ...(config.formula && {
            readOnly: true,
            'x-formula': { version: 1, expression: config.formula },
          }),
        },
      ]),
    ),
    additionalProperties: false,
    required: Object.keys(fields),
  }) as JsonSchema;

describe('prepareFormulas', () => {
  it('should return empty array when no formulas', () => {
    const schema = createSchema({
      name: { type: 'string' },
      price: { type: 'number' },
    });

    const result = prepareFormulas(schema);

    expect(result).toEqual([]);
  });

  it('should extract single formula', () => {
    const schema = createSchema({
      price: { type: 'number' },
      doubled: { type: 'number', formula: 'price * 2' },
    });

    const result = prepareFormulas(schema);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      fieldName: 'doubled',
      expression: 'price * 2',
      fieldType: 'number',
      dependencies: ['price'],
      isArrayItem: false,
      arrayPath: null,
      localFieldPath: 'doubled',
    });
  });

  it('should order formulas by dependencies', () => {
    const schema = createSchema({
      price: { type: 'number' },
      tax: { type: 'number', formula: 'subtotal * 0.1' },
      subtotal: { type: 'number', formula: 'price' },
      total: { type: 'number', formula: 'subtotal + tax' },
    });

    const result = prepareFormulas(schema);

    expect(result).toHaveLength(3);
    const names = result.map((f) => f.fieldName);
    expect(names.indexOf('subtotal')).toBeLessThan(names.indexOf('tax'));
    expect(names.indexOf('subtotal')).toBeLessThan(names.indexOf('total'));
    expect(names.indexOf('tax')).toBeLessThan(names.indexOf('total'));
  });

  it('should throw on cyclic dependencies', () => {
    const schema = createSchema({
      a: { type: 'number', formula: 'b + 1' },
      b: { type: 'number', formula: 'a + 1' },
    });

    expect(() => prepareFormulas(schema)).toThrow(
      'Cyclic dependency detected in formulas',
    );
  });

  it('should parse array item path', () => {
    const schema: JsonSchema = {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              price: { type: 'number' },
              doubled: {
                type: 'number',
                readOnly: true,
                'x-formula': { version: 1, expression: 'price * 2' },
              },
            },
            additionalProperties: false,
            required: ['price', 'doubled'],
          },
        },
      },
      additionalProperties: false,
      required: ['items'],
    } as JsonSchema;

    const result = prepareFormulas(schema);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      fieldName: 'items[].doubled',
      isArrayItem: true,
      arrayPath: 'items',
      localFieldPath: 'doubled',
    });
  });
});

describe('evaluateFormulas', () => {
  it('should compute simple formula', () => {
    const formulas: PreparedFormula[] = [
      {
        fieldName: 'doubled',
        expression: 'price * 2',
        fieldType: 'number',
        dependencies: ['price'],
        isArrayItem: false,
        arrayPath: null,
        localFieldPath: 'doubled',
      },
    ];

    const { values, errors } = evaluateFormulas(formulas, { price: 10 });

    expect(values).toEqual({ doubled: 20 });
    expect(errors).toEqual([]);
  });

  it('should compute chained formulas', () => {
    const formulas: PreparedFormula[] = [
      {
        fieldName: 'subtotal',
        expression: 'price',
        fieldType: 'number',
        dependencies: ['price'],
        isArrayItem: false,
        arrayPath: null,
        localFieldPath: 'subtotal',
      },
      {
        fieldName: 'tax',
        expression: 'subtotal * 0.1',
        fieldType: 'number',
        dependencies: ['subtotal'],
        isArrayItem: false,
        arrayPath: null,
        localFieldPath: 'tax',
      },
      {
        fieldName: 'total',
        expression: 'subtotal + tax',
        fieldType: 'number',
        dependencies: ['subtotal', 'tax'],
        isArrayItem: false,
        arrayPath: null,
        localFieldPath: 'total',
      },
    ];

    const { values, errors } = evaluateFormulas(formulas, { price: 100 });

    expect(values).toEqual({ subtotal: 100, tax: 10, total: 110 });
    expect(errors).toEqual([]);
  });

  it('should return errors for failed formulas', () => {
    const formulas: PreparedFormula[] = [
      {
        fieldName: 'result',
        expression: '(((',
        fieldType: 'number',
        dependencies: [],
        isArrayItem: false,
        arrayPath: null,
        localFieldPath: 'result',
      },
    ];

    const { values, errors } = evaluateFormulas(formulas, {});

    expect(values).toEqual({});
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({
      field: 'result',
      expression: '(((',
    });
  });

  it('should use defaults when formula fails and useDefaults is true', () => {
    const formulas: PreparedFormula[] = [
      {
        fieldName: 'result',
        expression: '(((',
        fieldType: 'number',
        dependencies: [],
        isArrayItem: false,
        arrayPath: null,
        localFieldPath: 'result',
      },
    ];

    const { values, errors } = evaluateFormulas(formulas, {}, { useDefaults: true });

    expect(values).toEqual({ result: 0 });
    expect(errors).toHaveLength(1);
    expect(errors[0]?.defaultUsed).toBe(true);
  });

  it('should use custom defaults', () => {
    const formulas: PreparedFormula[] = [
      {
        fieldName: 'result',
        expression: '(((',
        fieldType: 'number',
        dependencies: [],
        isArrayItem: false,
        arrayPath: null,
        localFieldPath: 'result',
      },
    ];

    const { values } = evaluateFormulas(
      formulas,
      {},
      { useDefaults: true, defaults: { result: 42 } },
    );

    expect(values).toEqual({ result: 42 });
  });

  it('should propagate failure to dependent formulas', () => {
    const formulas: PreparedFormula[] = [
      {
        fieldName: 'a',
        expression: '(((',
        fieldType: 'number',
        dependencies: [],
        isArrayItem: false,
        arrayPath: null,
        localFieldPath: 'a',
      },
      {
        fieldName: 'b',
        expression: 'a * 2',
        fieldType: 'number',
        dependencies: ['a'],
        isArrayItem: false,
        arrayPath: null,
        localFieldPath: 'b',
      },
    ];

    const { errors } = evaluateFormulas(formulas, {}, { useDefaults: true });

    expect(errors).toHaveLength(2);
    expect(errors[1]).toMatchObject({
      field: 'b',
      error: 'Dependency formula failed',
    });
  });

  it('should compute array item formulas', () => {
    const formulas: PreparedFormula[] = [
      {
        fieldName: 'items[].doubled',
        expression: 'price * 2',
        fieldType: 'number',
        dependencies: ['price'],
        isArrayItem: true,
        arrayPath: 'items',
        localFieldPath: 'doubled',
      },
    ];

    const data = {
      items: [
        { price: 10, doubled: 0 },
        { price: 20, doubled: 0 },
      ],
    };

    const { values, errors } = evaluateFormulas(formulas, data);

    expect(errors).toEqual([]);
    expect((values['items[0]'] as Record<string, unknown>)?.doubled).toBe(20);
    expect((values['items[1]'] as Record<string, unknown>)?.doubled).toBe(40);
    expect((data.items[0] as Record<string, unknown>).doubled).toBe(20);
    expect((data.items[1] as Record<string, unknown>).doubled).toBe(40);
  });

  it('should compute boolean formula', () => {
    const formulas: PreparedFormula[] = [
      {
        fieldName: 'isExpensive',
        expression: 'price > 100',
        fieldType: 'boolean',
        dependencies: ['price'],
        isArrayItem: false,
        arrayPath: null,
        localFieldPath: 'isExpensive',
      },
    ];

    const { values: values1 } = evaluateFormulas(formulas, { price: 50 });
    expect(values1).toEqual({ isExpensive: false });

    const { values: values2 } = evaluateFormulas(formulas, { price: 150 });
    expect(values2).toEqual({ isExpensive: true });
  });

  it('should compute string formula with concat', () => {
    const formulas: PreparedFormula[] = [
      {
        fieldName: 'fullName',
        expression: 'concat(firstName, " ", lastName)',
        fieldType: 'string',
        dependencies: ['firstName', 'lastName'],
        isArrayItem: false,
        arrayPath: null,
        localFieldPath: 'fullName',
      },
    ];

    const { values } = evaluateFormulas(formulas, {
      firstName: 'John',
      lastName: 'Doe',
    });

    expect(values).toEqual({ fullName: 'John Doe' });
  });

  it('should resolve root path /field in array item formula', () => {
    const formulas: PreparedFormula[] = [
      {
        fieldName: 'items[].priceWithTax',
        expression: 'price * (1 + /taxRate)',
        fieldType: 'number',
        dependencies: [],
        isArrayItem: true,
        arrayPath: 'items',
        localFieldPath: 'priceWithTax',
      },
    ];

    const data = {
      taxRate: 0.1,
      items: [
        { price: 100, priceWithTax: 0 },
        { price: 200, priceWithTax: 0 },
      ],
    };

    const { values, errors } = evaluateFormulas(formulas, data);

    expect(errors).toEqual([]);
    expect(
      (values['items[0]'] as Record<string, unknown>)?.priceWithTax,
    ).toBeCloseTo(110);
    expect(
      (values['items[1]'] as Record<string, unknown>)?.priceWithTax,
    ).toBeCloseTo(220);
  });

  it('should handle empty array', () => {
    const formulas: PreparedFormula[] = [
      {
        fieldName: 'items[].doubled',
        expression: 'price * 2',
        fieldType: 'number',
        dependencies: ['price'],
        isArrayItem: true,
        arrayPath: 'items',
        localFieldPath: 'doubled',
      },
    ];

    const { values, errors } = evaluateFormulas(formulas, { items: [] });

    expect(values).toEqual({});
    expect(errors).toEqual([]);
  });

  it('should compute nested object formula', () => {
    const formulas: PreparedFormula[] = [
      {
        fieldName: 'nested.computed',
        expression: 'rootValue * 2',
        fieldType: 'number',
        dependencies: ['rootValue'],
        isArrayItem: false,
        arrayPath: null,
        localFieldPath: 'nested.computed',
      },
    ];

    const data = { rootValue: 50, nested: { computed: 0 } };

    const { values, errors } = evaluateFormulas(formulas, data);

    expect(errors).toEqual([]);
    expect((values.nested as Record<string, unknown>)?.computed).toBe(100);
  });
});

describe('prepareFormulas + evaluateFormulas integration', () => {
  it('should work together', () => {
    const schema = createSchema({
      price: { type: 'number' },
      quantity: { type: 'number' },
      total: { type: 'number', formula: 'price * quantity' },
    });

    const formulas = prepareFormulas(schema);
    const { values, errors } = evaluateFormulas(formulas, {
      price: 10,
      quantity: 5,
    });

    expect(errors).toEqual([]);
    expect(values).toEqual({ total: 50 });
  });

  it('should handle complex chained formulas', () => {
    const schema = createSchema({
      price: { type: 'number' },
      taxRate: { type: 'number' },
      subtotal: { type: 'number', formula: 'price' },
      tax: { type: 'number', formula: 'subtotal * taxRate' },
      total: { type: 'number', formula: 'subtotal + tax' },
    });

    const formulas = prepareFormulas(schema);
    const { values, errors } = evaluateFormulas(formulas, {
      price: 100,
      taxRate: 0.2,
    });

    expect(errors).toEqual([]);
    expect(values).toEqual({ subtotal: 100, tax: 20, total: 120 });
  });
});
