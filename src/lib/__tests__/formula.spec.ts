import { JsonSchema } from '../../types/index.js';
import {
  collectFormulaNodes,
  evaluateFormulas,
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

describe('collectFormulaNodes', () => {
  it('should return empty array when no formulas', () => {
    const schema = createSchema({
      name: { type: 'string' },
      price: { type: 'number' },
    });

    const result = collectFormulaNodes(schema, { name: 'test', price: 10 });

    expect(result).toEqual([]);
  });

  it('should collect single formula', () => {
    const schema = createSchema({
      price: { type: 'number' },
      doubled: { type: 'number', formula: 'price * 2' },
    });

    const result = collectFormulaNodes(schema, { price: 10, doubled: 0 });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      path: 'doubled',
      expression: 'price * 2',
      fieldType: 'number',
      currentPath: '',
      dependencies: ['price'],
    });
  });

  it('should collect formulas from array items with concrete indices', () => {
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

    const data = {
      items: [
        { price: 10, doubled: 0 },
        { price: 20, doubled: 0 },
      ],
    };

    const result = collectFormulaNodes(schema, data);

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      path: 'items[0].doubled',
      currentPath: 'items[0]',
    });
    expect(result[1]).toMatchObject({
      path: 'items[1].doubled',
      currentPath: 'items[1]',
    });
  });

  it('should collect formulas from nested arrays', () => {
    const schema: JsonSchema = {
      type: 'object',
      properties: {
        orders: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              items: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    qty: { type: 'number' },
                    price: { type: 'number' },
                    total: {
                      type: 'number',
                      readOnly: true,
                      'x-formula': { version: 1, expression: 'qty * price' },
                    },
                  },
                  additionalProperties: false,
                  required: ['qty', 'price', 'total'],
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
    } as JsonSchema;

    const data = {
      orders: [
        { items: [{ qty: 2, price: 10, total: 0 }, { qty: 3, price: 5, total: 0 }] },
        { items: [{ qty: 1, price: 20, total: 0 }] },
      ],
    };

    const result = collectFormulaNodes(schema, data);

    expect(result).toHaveLength(3);
    expect(result[0]?.path).toBe('orders[0].items[0].total');
    expect(result[0]?.currentPath).toBe('orders[0].items[0]');
    expect(result[1]?.path).toBe('orders[0].items[1].total');
    expect(result[2]?.path).toBe('orders[1].items[0].total');
  });

  it('should ignore formulas on non-primitive types', () => {
    const schema: JsonSchema = {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          'x-formula': { version: 1, expression: 'something' },
          properties: {},
        },
        valid: {
          type: 'number',
          'x-formula': { version: 1, expression: '1 + 1' },
        },
      },
      additionalProperties: false,
      required: ['data', 'valid'],
    } as JsonSchema;

    const result = collectFormulaNodes(schema, { data: {}, valid: 0 });

    expect(result).toHaveLength(1);
    expect(result[0]?.path).toBe('valid');
  });
});

describe('evaluateFormulas', () => {
  it('should compute simple formula', () => {
    const schema = createSchema({
      price: { type: 'number' },
      doubled: { type: 'number', formula: 'price * 2' },
    });

    const data = { price: 10, doubled: 0 };
    const { values, errors } = evaluateFormulas(schema, data);

    expect(errors).toEqual([]);
    expect(values).toEqual({ doubled: 20 });
    expect(data.doubled).toBe(20);
  });

  it('should compute chained formulas', () => {
    const schema = createSchema({
      price: { type: 'number' },
      subtotal: { type: 'number', formula: 'price' },
      tax: { type: 'number', formula: 'subtotal * 0.1' },
      total: { type: 'number', formula: 'subtotal + tax' },
    });

    const data = { price: 100, subtotal: 0, tax: 0, total: 0 };
    const { values, errors } = evaluateFormulas(schema, data);

    expect(errors).toEqual([]);
    expect(values).toEqual({ subtotal: 100, tax: 10, total: 110 });
  });

  it('should return errors for failed formulas', () => {
    const schema = createSchema({
      result: { type: 'number', formula: '(((' },
    });

    const data = { result: 0 };
    const { values, errors } = evaluateFormulas(schema, data);

    expect(values).toEqual({});
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({
      field: 'result',
      expression: '(((',
    });
  });

  it('should use defaults when formula fails and useDefaults is true', () => {
    const schema = createSchema({
      result: { type: 'number', formula: '(((' },
    });

    const data = { result: 99 };
    const { values, errors } = evaluateFormulas(schema, data, { useDefaults: true });

    expect(values).toEqual({ result: 0 });
    expect(data.result).toBe(0);
    expect(errors).toHaveLength(1);
    expect(errors[0]?.defaultUsed).toBe(true);
  });

  it('should use custom defaults', () => {
    const schema = createSchema({
      result: { type: 'number', formula: '(((' },
    });

    const data = { result: 0 };
    const { values } = evaluateFormulas(schema, data, {
      useDefaults: true,
      defaults: { result: 42 },
    });

    expect(values).toEqual({ result: 42 });
  });

  it('should propagate failure to dependent formulas', () => {
    const schema = createSchema({
      a: { type: 'number', formula: '(((' },
      b: { type: 'number', formula: 'a * 2' },
    });

    const data = { a: 0, b: 0 };
    const { errors } = evaluateFormulas(schema, data, { useDefaults: true });

    expect(errors).toHaveLength(2);
    expect(errors[1]).toMatchObject({
      field: 'b',
      error: 'Dependency formula failed',
    });
  });

  it('should compute array item formulas', () => {
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

    const data = {
      items: [
        { price: 10, doubled: 0 },
        { price: 20, doubled: 0 },
      ],
    };

    const { values, errors } = evaluateFormulas(schema, data);

    expect(errors).toEqual([]);
    expect(values['items[0].doubled']).toBe(20);
    expect(values['items[1].doubled']).toBe(40);
    expect(data.items[0]?.doubled).toBe(20);
    expect(data.items[1]?.doubled).toBe(40);
  });

  it('should compute boolean formula', () => {
    const schema = createSchema({
      price: { type: 'number' },
      isExpensive: { type: 'boolean', formula: 'price > 100' },
    });

    const { values: values1 } = evaluateFormulas(schema, { price: 50, isExpensive: true });
    expect(values1).toEqual({ isExpensive: false });

    const { values: values2 } = evaluateFormulas(schema, { price: 150, isExpensive: false });
    expect(values2).toEqual({ isExpensive: true });
  });

  it('should compute string formula with concat', () => {
    const schema = createSchema({
      firstName: { type: 'string' },
      lastName: { type: 'string' },
      fullName: { type: 'string', formula: 'concat(firstName, " ", lastName)' },
    });

    const data = { firstName: 'John', lastName: 'Doe', fullName: '' };
    const { values } = evaluateFormulas(schema, data);

    expect(values).toEqual({ fullName: 'John Doe' });
  });

  it('should handle empty array', () => {
    const schema: JsonSchema = {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              doubled: {
                type: 'number',
                'x-formula': { version: 1, expression: 'price * 2' },
              },
            },
          },
        },
      },
    } as JsonSchema;

    const { values, errors } = evaluateFormulas(schema, { items: [] });

    expect(values).toEqual({});
    expect(errors).toEqual([]);
  });

  it('should return empty result when no formulas', () => {
    const schema = createSchema({
      name: { type: 'string' },
      price: { type: 'number' },
    });

    const { values, errors } = evaluateFormulas(schema, { name: 'test', price: 10 });

    expect(values).toEqual({});
    expect(errors).toEqual([]);
  });

  it('should provide correct defaults for each type', () => {
    const schema = createSchema({
      num: { type: 'number', formula: '(((' },
      str: { type: 'string', formula: '(((' },
      bool: { type: 'boolean', formula: '(((' },
    });

    const data = { num: 99, str: 'old', bool: true };
    const { values } = evaluateFormulas(schema, data, { useDefaults: true });

    expect(values.num).toBe(0);
    expect(values.str).toBe('');
    expect(values.bool).toBe(false);
  });
});

describe('nested object formulas', () => {
  it('should compute nested object formula referencing root field', () => {
    const schema: JsonSchema = {
      type: 'object',
      properties: {
        rootValue: { type: 'number' },
        nested: {
          type: 'object',
          properties: {
            computed: {
              type: 'number',
              'x-formula': { version: 1, expression: 'rootValue * 2' },
            },
          },
        },
      },
    } as JsonSchema;

    const data = { rootValue: 50, nested: { computed: 0 } };
    const { values, errors } = evaluateFormulas(schema, data);

    expect(errors).toEqual([]);
    expect(values['nested.computed']).toBe(100);
  });

  it('should compute nested object formula referencing sibling field', () => {
    const schema: JsonSchema = {
      type: 'object',
      properties: {
        nested: {
          type: 'object',
          properties: {
            sourceValue: { type: 'number' },
            computed: {
              type: 'number',
              'x-formula': { version: 1, expression: 'sourceValue * 2' },
            },
          },
        },
      },
    } as JsonSchema;

    const data = { nested: { sourceValue: 25, computed: 0 } };
    const { values, errors } = evaluateFormulas(schema, data);

    expect(errors).toEqual([]);
    expect(values['nested.computed']).toBe(50);
    expect(data.nested.computed).toBe(50);
  });

  it('should compute deeply nested object formula', () => {
    const schema: JsonSchema = {
      type: 'object',
      properties: {
        level1: {
          type: 'object',
          properties: {
            level2: {
              type: 'object',
              properties: {
                value: { type: 'number' },
                result: {
                  type: 'number',
                  'x-formula': { version: 1, expression: 'value * 3' },
                },
              },
            },
          },
        },
      },
    } as JsonSchema;

    const data = { level1: { level2: { value: 10, result: 0 } } };
    const { values, errors } = evaluateFormulas(schema, data);

    expect(errors).toEqual([]);
    expect(values['level1.level2.result']).toBe(30);
  });
});

describe('root path formulas', () => {
  it('should resolve root path /field in array item formula', () => {
    const schema: JsonSchema = {
      type: 'object',
      properties: {
        taxRate: { type: 'number' },
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              price: { type: 'number' },
              priceWithTax: {
                type: 'number',
                'x-formula': { version: 1, expression: 'price * (1 + /taxRate)' },
              },
            },
          },
        },
      },
    } as JsonSchema;

    const data = {
      taxRate: 0.1,
      items: [
        { price: 100, priceWithTax: 0 },
        { price: 200, priceWithTax: 0 },
      ],
    };

    const { values, errors } = evaluateFormulas(schema, data);

    expect(errors).toEqual([]);
    expect(values['items[0].priceWithTax']).toBeCloseTo(110);
    expect(values['items[1].priceWithTax']).toBeCloseTo(220);
  });

  it('should resolve nested root path /config.multiplier in array item formula', () => {
    const schema: JsonSchema = {
      type: 'object',
      properties: {
        config: {
          type: 'object',
          properties: {
            multiplier: { type: 'number' },
          },
        },
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              value: { type: 'number' },
              result: {
                type: 'number',
                'x-formula': { version: 1, expression: 'value * /config.multiplier' },
              },
            },
          },
        },
      },
    } as JsonSchema;

    const data = {
      config: { multiplier: 3 },
      items: [
        { value: 10, result: 0 },
        { value: 20, result: 0 },
      ],
    };

    const { values, errors } = evaluateFormulas(schema, data);

    expect(errors).toEqual([]);
    expect(values['items[0].result']).toBe(30);
    expect(values['items[1].result']).toBe(60);
  });
});

describe('relative path formulas', () => {
  it('should compute formula with ../field from array item to root', () => {
    const schema: JsonSchema = {
      type: 'object',
      properties: {
        discount: { type: 'number' },
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              price: { type: 'number' },
              discounted: {
                type: 'number',
                'x-formula': { version: 1, expression: 'price * (1 - ../discount)' },
              },
            },
          },
        },
      },
    } as JsonSchema;

    const data = {
      discount: 0.2,
      items: [{ price: 100, discounted: 0 }],
    };

    const { values, errors } = evaluateFormulas(schema, data);

    expect(errors).toEqual([]);
    expect(values['items[0].discounted']).toBe(80);
  });

  it('should compute formula with ../field from nested object in array', () => {
    const schema: JsonSchema = {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              itemVal: { type: 'number' },
              inner: {
                type: 'object',
                properties: {
                  price: { type: 'number' },
                  calc: {
                    type: 'number',
                    'x-formula': { version: 1, expression: 'price * ../itemVal' },
                  },
                },
              },
            },
          },
        },
      },
    } as JsonSchema;

    const data = {
      items: [{ itemVal: 10, inner: { price: 5, calc: 0 } }],
    };

    const { values, errors } = evaluateFormulas(schema, data);

    expect(errors).toEqual([]);
    expect(values['items[0].inner.calc']).toBe(50);
  });

  it('should compute formula with ../../field from nested object in array to root', () => {
    const schema: JsonSchema = {
      type: 'object',
      properties: {
        rootRate: { type: 'number' },
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              inner: {
                type: 'object',
                properties: {
                  price: { type: 'number' },
                  rootCalc: {
                    type: 'number',
                    'x-formula': { version: 1, expression: 'price * ../../rootRate' },
                  },
                },
              },
            },
          },
        },
      },
    } as JsonSchema;

    const data = {
      rootRate: 2,
      items: [{ inner: { price: 5, rootCalc: 0 } }],
    };

    const { values, errors } = evaluateFormulas(schema, data);

    expect(errors).toEqual([]);
    expect(values['items[0].inner.rootCalc']).toBe(10);
  });

  it('should compute formula with ../containerRate from array inside object', () => {
    const schema: JsonSchema = {
      type: 'object',
      properties: {
        container: {
          type: 'object',
          properties: {
            containerRate: { type: 'number' },
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  price: { type: 'number' },
                  parentTotal: {
                    type: 'number',
                    'x-formula': { version: 1, expression: 'price * ../containerRate' },
                  },
                },
              },
            },
          },
        },
      },
    } as JsonSchema;

    const data = {
      container: {
        containerRate: 2,
        items: [{ price: 10, parentTotal: 0 }],
      },
    };

    const { values, errors } = evaluateFormulas(schema, data);

    expect(errors).toEqual([]);
    expect(values['container.items[0].parentTotal']).toBe(20);
  });

  it('should compute formula with ../../rootVal from array inside object', () => {
    const schema: JsonSchema = {
      type: 'object',
      properties: {
        rootVal: { type: 'number' },
        container: {
          type: 'object',
          properties: {
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  price: { type: 'number' },
                  rootTotal: {
                    type: 'number',
                    'x-formula': { version: 1, expression: 'price * ../../rootVal' },
                  },
                },
              },
            },
          },
        },
      },
    } as JsonSchema;

    const data = {
      rootVal: 3,
      container: {
        items: [{ price: 10, rootTotal: 0 }],
      },
    };

    const { values, errors } = evaluateFormulas(schema, data);

    expect(errors).toEqual([]);
    expect(values['container.items[0].rootTotal']).toBe(30);
  });

  it('should compute formula with ../../factor from deep nested non-array path', () => {
    const schema: JsonSchema = {
      type: 'object',
      properties: {
        factor: { type: 'number' },
        nested: {
          type: 'object',
          properties: {
            deep: {
              type: 'object',
              properties: {
                value: { type: 'number' },
                result: {
                  type: 'number',
                  'x-formula': { version: 1, expression: 'value * ../../factor' },
                },
              },
            },
          },
        },
      },
    } as JsonSchema;

    const data = {
      factor: 5,
      nested: { deep: { value: 10, result: 0 } },
    };

    const { values, errors } = evaluateFormulas(schema, data);

    expect(errors).toEqual([]);
    expect(values['nested.deep.result']).toBe(50);
  });

  it('should compute formula with ../../../multiplier triple relative path', () => {
    const schema: JsonSchema = {
      type: 'object',
      properties: {
        multiplier: { type: 'number' },
        a: {
          type: 'object',
          properties: {
            b: {
              type: 'object',
              properties: {
                c: {
                  type: 'object',
                  properties: {
                    val: { type: 'number' },
                    result: {
                      type: 'number',
                      'x-formula': { version: 1, expression: 'val * ../../../multiplier' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    } as JsonSchema;

    const data = {
      multiplier: 3,
      a: { b: { c: { val: 7, result: 0 } } },
    };

    const { values, errors } = evaluateFormulas(schema, data);

    expect(errors).toEqual([]);
    expect(values['a.b.c.result']).toBe(21);
  });

  it('should compute formula with ../sibling.nested path', () => {
    const schema: JsonSchema = {
      type: 'object',
      properties: {
        config: {
          type: 'object',
          properties: {
            discount: { type: 'number' },
          },
        },
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              price: { type: 'number' },
              discountedPrice: {
                type: 'number',
                'x-formula': { version: 1, expression: 'price * ../config.discount' },
              },
            },
          },
        },
      },
    } as JsonSchema;

    const data = {
      config: { discount: 0.9 },
      items: [{ price: 100, discountedPrice: 0 }],
    };

    const { values, errors } = evaluateFormulas(schema, data);

    expect(errors).toEqual([]);
    expect(values['items[0].discountedPrice']).toBe(90);
  });

  it('should compute formula with ../../settings.tax.rate deep sibling path', () => {
    const schema: JsonSchema = {
      type: 'object',
      properties: {
        settings: {
          type: 'object',
          properties: {
            tax: {
              type: 'object',
              properties: {
                rate: { type: 'number' },
              },
            },
          },
        },
        orders: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              inner: {
                type: 'object',
                properties: {
                  amount: { type: 'number' },
                  taxAmount: {
                    type: 'number',
                    'x-formula': { version: 1, expression: 'amount * ../../settings.tax.rate' },
                  },
                },
              },
            },
          },
        },
      },
    } as JsonSchema;

    const data = {
      settings: { tax: { rate: 0.1 } },
      orders: [{ inner: { amount: 200, taxAmount: 0 } }],
    };

    const { values, errors } = evaluateFormulas(schema, data);

    expect(errors).toEqual([]);
    expect(values['orders[0].inner.taxAmount']).toBe(20);
  });
});

describe('nested arrays', () => {
  it('should compute formulas in nested arrays (items[].subItems[])', () => {
    const schema: JsonSchema = {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              subItems: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    qty: { type: 'number' },
                    price: { type: 'number' },
                    total: {
                      type: 'number',
                      'x-formula': { version: 1, expression: 'qty * price' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    } as JsonSchema;

    const data = {
      items: [
        { subItems: [{ qty: 2, price: 10, total: 0 }, { qty: 3, price: 5, total: 0 }] },
        { subItems: [{ qty: 1, price: 20, total: 0 }] },
      ],
    };

    const { values, errors } = evaluateFormulas(schema, data);

    expect(errors).toEqual([]);
    expect(values['items[0].subItems[0].total']).toBe(20);
    expect(values['items[0].subItems[1].total']).toBe(15);
    expect(values['items[1].subItems[0].total']).toBe(20);
    expect(data.items[0]?.subItems[0]?.total).toBe(20);
    expect(data.items[0]?.subItems[1]?.total).toBe(15);
    expect(data.items[1]?.subItems[0]?.total).toBe(20);
  });

  it('should compute formula with ../itemPrice from nested array to parent array item', () => {
    const schema: JsonSchema = {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              itemPrice: { type: 'number' },
              subItems: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    qty: { type: 'number' },
                    lineTotal: {
                      type: 'number',
                      'x-formula': { version: 1, expression: 'qty * ../itemPrice' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    } as JsonSchema;

    const data = {
      items: [
        { itemPrice: 10, subItems: [{ qty: 3, lineTotal: 0 }] },
      ],
    };

    const { values, errors } = evaluateFormulas(schema, data);

    expect(errors).toEqual([]);
    expect(values['items[0].subItems[0].lineTotal']).toBe(30);
  });

  it('should compute formula with ../../globalRate from nested array to root', () => {
    const schema: JsonSchema = {
      type: 'object',
      properties: {
        globalRate: { type: 'number' },
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              subItems: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    qty: { type: 'number' },
                    adjusted: {
                      type: 'number',
                      'x-formula': { version: 1, expression: 'qty * ../../globalRate' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    } as JsonSchema;

    const data = {
      globalRate: 2,
      items: [
        { subItems: [{ qty: 5, adjusted: 0 }] },
      ],
    };

    const { values, errors } = evaluateFormulas(schema, data);

    expect(errors).toEqual([]);
    expect(values['items[0].subItems[0].adjusted']).toBe(10);
  });

  it('should compute formula in array inside object inside array (items[].container.subItems[])', () => {
    const schema: JsonSchema = {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              container: {
                type: 'object',
                properties: {
                  containerMultiplier: { type: 'number' },
                  subItems: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        val: { type: 'number' },
                        result: {
                          type: 'number',
                          'x-formula': { version: 1, expression: 'val * ../containerMultiplier' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    } as JsonSchema;

    const data = {
      items: [
        { container: { containerMultiplier: 4, subItems: [{ val: 3, result: 0 }] } },
      ],
    };

    const { values, errors } = evaluateFormulas(schema, data);

    expect(errors).toEqual([]);
    expect(values['items[0].container.subItems[0].result']).toBe(12);
  });

  it('should compute formula with ../../itemRate from array in object in array to parent array item', () => {
    const schema: JsonSchema = {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              itemRate: { type: 'number' },
              container: {
                type: 'object',
                properties: {
                  subItems: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        val: { type: 'number' },
                        result: {
                          type: 'number',
                          'x-formula': { version: 1, expression: 'val * ../../itemRate' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    } as JsonSchema;

    const data = {
      items: [
        { itemRate: 5, container: { subItems: [{ val: 2, result: 0 }] } },
      ],
    };

    const { values, errors } = evaluateFormulas(schema, data);

    expect(errors).toEqual([]);
    expect(values['items[0].container.subItems[0].result']).toBe(10);
  });

  it('should compute formula with ../../../rootFactor from array in object in array to root', () => {
    const schema: JsonSchema = {
      type: 'object',
      properties: {
        rootFactor: { type: 'number' },
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              container: {
                type: 'object',
                properties: {
                  subItems: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        val: { type: 'number' },
                        result: {
                          type: 'number',
                          'x-formula': { version: 1, expression: 'val * ../../../rootFactor' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    } as JsonSchema;

    const data = {
      rootFactor: 3,
      items: [
        { container: { subItems: [{ val: 7, result: 0 }] } },
      ],
    };

    const { values, errors } = evaluateFormulas(schema, data);

    expect(errors).toEqual([]);
    expect(values['items[0].container.subItems[0].result']).toBe(21);
  });
});

describe('cyclic dependencies', () => {
  it('should throw on cyclic dependencies', () => {
    const schema = createSchema({
      a: { type: 'number', formula: 'b + 1' },
      b: { type: 'number', formula: 'a + 1' },
    });

    expect(() => evaluateFormulas(schema, { a: 0, b: 0 })).toThrow(
      'Cyclic dependency detected in formulas',
    );
  });
});
