import { extractSchemaFormulas } from '../extract-schema-formulas.js';

describe('extractSchemaFormulas', () => {
  it('should return empty array for schema without formulas', () => {
    const schema = {
      type: 'object',
      properties: {
        name: { type: 'string' },
        price: { type: 'number' },
      },
    };

    const result = extractSchemaFormulas(schema);

    expect(result).toEqual([]);
  });

  it('should extract single formula', () => {
    const schema = {
      type: 'object',
      properties: {
        price: { type: 'number' },
        tax: {
          type: 'number',
          'x-formula': { version: 1, expression: 'price * 0.1' },
        },
      },
    };

    const result = extractSchemaFormulas(schema);

    expect(result).toHaveLength(1);
    const formula = result[0]!;
    expect(formula.fieldName).toBe('tax');
    expect(formula.expression).toBe('price * 0.1');
    expect(formula.fieldType).toBe('number');
  });

  it('should extract multiple formulas', () => {
    const schema = {
      type: 'object',
      properties: {
        price: { type: 'number' },
        quantity: { type: 'number' },
        subtotal: {
          type: 'number',
          'x-formula': { version: 1, expression: 'price * quantity' },
        },
        tax: {
          type: 'number',
          'x-formula': { version: 1, expression: 'subtotal * 0.1' },
        },
        total: {
          type: 'number',
          'x-formula': { version: 1, expression: 'subtotal + tax' },
        },
      },
    };

    const result = extractSchemaFormulas(schema);

    expect(result).toHaveLength(3);
    expect(result.map((f) => f.fieldName)).toEqual([
      'subtotal',
      'tax',
      'total',
    ]);
  });

  it('should extract field type', () => {
    const schema = {
      type: 'object',
      properties: {
        price: { type: 'number' },
        formatted: {
          type: 'string',
          'x-formula': { version: 1, expression: 'concat("$", price)' },
        },
        isExpensive: {
          type: 'boolean',
          'x-formula': { version: 1, expression: 'price > 100' },
        },
      },
    };

    const result = extractSchemaFormulas(schema);

    expect(result).toHaveLength(2);
    expect(result.find((f) => f.fieldName === 'formatted')?.fieldType).toBe(
      'string',
    );
    expect(result.find((f) => f.fieldName === 'isExpensive')?.fieldType).toBe(
      'boolean',
    );
  });

  it('should handle schema without properties', () => {
    const schema = { type: 'object' };

    const result = extractSchemaFormulas(schema);

    expect(result).toEqual([]);
  });

  it('should default to string type when type is missing', () => {
    const schema = {
      type: 'object',
      properties: {
        computed: {
          'x-formula': { version: 1, expression: 'value' },
        },
      },
    };

    const result = extractSchemaFormulas(schema);

    expect(result[0]!.fieldType).toBe('string');
  });

  describe('nested objects', () => {
    it('should extract formulas from nested objects', () => {
      const schema = {
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
      };

      const result = extractSchemaFormulas(schema);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        fieldName: 'nested.computed',
        expression: 'rootValue * 2',
        fieldType: 'number',
      });
    });

    it('should extract formulas from deeply nested objects', () => {
      const schema = {
        type: 'object',
        properties: {
          level1: {
            type: 'object',
            properties: {
              level2: {
                type: 'object',
                properties: {
                  computed: {
                    type: 'number',
                    'x-formula': { version: 1, expression: 'value * 3' },
                  },
                },
              },
            },
          },
        },
      };

      const result = extractSchemaFormulas(schema);

      expect(result).toHaveLength(1);
      expect(result[0]?.fieldName).toBe('level1.level2.computed');
    });

    it('should extract formulas from both root and nested levels', () => {
      const schema = {
        type: 'object',
        properties: {
          price: { type: 'number' },
          tax: {
            type: 'number',
            'x-formula': { version: 1, expression: 'price * 0.1' },
          },
          details: {
            type: 'object',
            properties: {
              total: {
                type: 'number',
                'x-formula': { version: 1, expression: 'price + tax' },
              },
            },
          },
        },
      };

      const result = extractSchemaFormulas(schema);

      expect(result).toHaveLength(2);
      expect(result.map((f) => f.fieldName)).toContain('tax');
      expect(result.map((f) => f.fieldName)).toContain('details.total');
    });
  });

  describe('array items', () => {
    it('should extract formulas from array items', () => {
      const schema = {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                price: { type: 'number' },
                quantity: { type: 'number' },
                total: {
                  type: 'number',
                  'x-formula': { version: 1, expression: 'price * quantity' },
                },
              },
            },
          },
        },
      };

      const result = extractSchemaFormulas(schema);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        fieldName: 'items[].total',
        expression: 'price * quantity',
        fieldType: 'number',
      });
    });

    it('should extract formulas from nested objects inside array items', () => {
      const schema = {
        type: 'object',
        properties: {
          orders: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                details: {
                  type: 'object',
                  properties: {
                    computed: {
                      type: 'number',
                      'x-formula': { version: 1, expression: 'value * 2' },
                    },
                  },
                },
              },
            },
          },
        },
      };

      const result = extractSchemaFormulas(schema);

      expect(result).toHaveLength(1);
      expect(result[0]?.fieldName).toBe('orders[].details.computed');
    });

    it('should extract formulas from nested arrays', () => {
      const schema = {
        type: 'object',
        properties: {
          matrix: {
            type: 'array',
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  value: { type: 'number' },
                  doubled: {
                    type: 'number',
                    'x-formula': { version: 1, expression: 'value * 2' },
                  },
                },
              },
            },
          },
        },
      };

      const result = extractSchemaFormulas(schema);

      expect(result).toHaveLength(1);
      expect(result[0]?.fieldName).toBe('matrix[][].doubled');
    });
  });
});
