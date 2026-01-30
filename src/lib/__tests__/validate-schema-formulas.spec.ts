import {
  validateFormulaAgainstSchema,
  validateSchemaFormulas,
} from '../validate-schema-formulas.js';

interface JsonSchema {
  type?: string;
  properties?: Record<string, unknown>;
  items?: unknown;
  [key: string]: unknown;
}

describe('validateFormulaAgainstSchema', () => {
  const schema: JsonSchema = {
    type: 'object',
    properties: {
      price: { type: 'number' },
      quantity: { type: 'number' },
      total: {
        type: 'number',
        'x-formula': { version: 1, expression: 'price * quantity' },
      },
      stats: { type: 'object' },
    },
  };

  it('should return null for valid formula', () => {
    const result = validateFormulaAgainstSchema(
      'price * quantity',
      'total',
      schema,
    );
    expect(result).toBeNull();
  });

  it('should return error for invalid syntax', () => {
    const result = validateFormulaAgainstSchema('price *', 'total', schema);
    expect(result).not.toBeNull();
    expect(result?.error).toBeDefined();
    expect(result?.position).toBeDefined();
  });

  it('should return error for unknown field', () => {
    const result = validateFormulaAgainstSchema(
      'price * unknown',
      'total',
      schema,
    );
    expect(result).not.toBeNull();
    expect(result?.error).toBe("Unknown field 'unknown' in formula");
  });

  it('should return error for self-reference', () => {
    const result = validateFormulaAgainstSchema('total * 2', 'total', schema);
    expect(result).not.toBeNull();
    expect(result?.error).toBe('Formula cannot reference itself');
  });

  it('should validate nested path with known root', () => {
    const result = validateFormulaAgainstSchema(
      'stats.damage',
      'total',
      schema,
    );
    expect(result).toBeNull();
  });

  it('should return error for nested path with unknown root', () => {
    const result = validateFormulaAgainstSchema(
      'unknown.field',
      'total',
      schema,
    );
    expect(result).not.toBeNull();
    expect(result?.error).toBe("Unknown field 'unknown' in formula");
  });

  it('should return error for type mismatch - boolean to number', () => {
    const result = validateFormulaAgainstSchema('price > 100', 'total', schema);
    expect(result).not.toBeNull();
    expect(result?.error).toBe(
      "Type mismatch: formula returns 'boolean' but field expects 'number'",
    );
  });

  it('should allow matching types - number to number', () => {
    const result = validateFormulaAgainstSchema(
      'price * quantity',
      'total',
      schema,
    );
    expect(result).toBeNull();
  });

  it('should allow unknown inferred type', () => {
    const schemaWithString: JsonSchema = {
      type: 'object',
      properties: {
        name: { type: 'string' },
        computed: {
          type: 'string',
          'x-formula': { version: 1, expression: 'name' },
        },
      },
    };
    const result = validateFormulaAgainstSchema(
      'name',
      'computed',
      schemaWithString,
    );
    expect(result).toBeNull();
  });

  it('should return error for string formula on number field', () => {
    const schemaWithName: JsonSchema = {
      type: 'object',
      properties: {
        name: { type: 'string' },
        total: {
          type: 'number',
          'x-formula': { version: 1, expression: 'upper(name)' },
        },
      },
    };
    const result = validateFormulaAgainstSchema(
      'upper(name)',
      'total',
      schemaWithName,
    );
    expect(result).not.toBeNull();
    expect(result?.error).toBe(
      "Type mismatch: formula returns 'string' but field expects 'number'",
    );
  });
});

describe('validateSchemaFormulas', () => {
  it('should validate schema with valid formulas', () => {
    const schema: JsonSchema = {
      type: 'object',
      properties: {
        price: { type: 'number' },
        quantity: { type: 'number' },
        total: {
          type: 'number',
          'x-formula': { version: 1, expression: 'price * quantity' },
        },
      },
    };

    const result = validateSchemaFormulas(schema);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should return errors for invalid syntax', () => {
    const schema: JsonSchema = {
      type: 'object',
      properties: {
        price: { type: 'number' },
        total: {
          type: 'number',
          'x-formula': { version: 1, expression: 'price *' },
        },
      },
    };

    const result = validateSchemaFormulas(schema);
    expect(result.isValid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]?.field).toBe('total');
  });

  it('should detect circular dependencies', () => {
    const schema: JsonSchema = {
      type: 'object',
      properties: {
        a: { type: 'number', 'x-formula': { version: 1, expression: 'b + 1' } },
        b: { type: 'number', 'x-formula': { version: 1, expression: 'a + 1' } },
      },
    };

    const result = validateSchemaFormulas(schema);
    expect(result.isValid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]?.error).toContain('Circular dependency');
  });

  it('should validate schema without formulas', () => {
    const schema: JsonSchema = {
      type: 'object',
      properties: {
        price: { type: 'number' },
        name: { type: 'string' },
      },
    };

    const result = validateSchemaFormulas(schema);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should collect all errors', () => {
    const schema: JsonSchema = {
      type: 'object',
      properties: {
        price: { type: 'number' },
        a: {
          type: 'number',
          'x-formula': { version: 1, expression: 'unknown1' },
        },
        b: {
          type: 'number',
          'x-formula': { version: 1, expression: 'unknown2' },
        },
      },
    };

    const result = validateSchemaFormulas(schema);
    expect(result.isValid).toBe(false);
    expect(result.errors).toHaveLength(2);
  });

  describe('nested formulas', () => {
    it('should validate formula inside nested object', () => {
      const schema: JsonSchema = {
        type: 'object',
        properties: {
          price: { type: 'number' },
          details: {
            type: 'object',
            properties: {
              basePrice: { type: 'number' },
              tax: {
                type: 'number',
                'x-formula': { version: 1, expression: 'basePrice * 0.1' },
              },
            },
          },
        },
      };

      const result = validateSchemaFormulas(schema);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate formula inside array items', () => {
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
                quantity: { type: 'number' },
                subtotal: {
                  type: 'number',
                  'x-formula': { version: 1, expression: 'price * quantity' },
                },
              },
            },
          },
        },
      };

      const result = validateSchemaFormulas(schema);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid field in nested formula', () => {
      const schema: JsonSchema = {
        type: 'object',
        properties: {
          details: {
            type: 'object',
            properties: {
              tax: {
                type: 'number',
                'x-formula': { version: 1, expression: 'unknownField * 0.1' },
              },
            },
          },
        },
      };

      const result = validateSchemaFormulas(schema);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]?.error).toBe(
        "Unknown field 'unknownField' in formula",
      );
    });

    it('should detect circular dependency in nested formulas', () => {
      const schema: JsonSchema = {
        type: 'object',
        properties: {
          nested: {
            type: 'object',
            properties: {
              a: {
                type: 'number',
                'x-formula': { version: 1, expression: 'b + 1' },
              },
              b: {
                type: 'number',
                'x-formula': { version: 1, expression: 'a + 1' },
              },
            },
          },
        },
      };

      const result = validateSchemaFormulas(schema);
      expect(result.isValid).toBe(false);
      expect(result.errors[0]?.error).toContain('Circular dependency');
    });

    it('should validate type mismatch in nested formula', () => {
      const schema: JsonSchema = {
        type: 'object',
        properties: {
          details: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              count: {
                type: 'number',
                'x-formula': { version: 1, expression: 'upper(name)' },
              },
            },
          },
        },
      };

      const result = validateSchemaFormulas(schema);
      expect(result.isValid).toBe(false);
      expect(result.errors[0]?.error).toContain('Type mismatch');
    });
  });

  describe('root path references', () => {
    it('should validate formula with root path reference /field', () => {
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
                tax: {
                  type: 'number',
                  'x-formula': { version: 1, expression: 'price * /taxRate' },
                },
              },
            },
          },
        },
      };

      const result = validateSchemaFormulas(schema);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect unknown root field with /field syntax', () => {
      const schema: JsonSchema = {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                price: { type: 'number' },
                tax: {
                  type: 'number',
                  'x-formula': { version: 1, expression: 'price * /unknownRate' },
                },
              },
            },
          },
        },
      };

      const result = validateSchemaFormulas(schema);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]?.error).toBe(
        "Unknown root field 'unknownRate' in formula",
      );
    });

    it('should validate nested root path like /config.rate', () => {
      const schema: JsonSchema = {
        type: 'object',
        properties: {
          config: {
            type: 'object',
            properties: {
              rate: { type: 'number' },
            },
          },
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                value: { type: 'number' },
                computed: {
                  type: 'number',
                  'x-formula': { version: 1, expression: 'value * /config.rate' },
                },
              },
            },
          },
        },
      };

      const result = validateSchemaFormulas(schema);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect circular dependency with root path references', () => {
      const schema: JsonSchema = {
        type: 'object',
        properties: {
          rate: {
            type: 'number',
            'x-formula': { version: 1, expression: 'multiplier * 2' },
          },
          multiplier: {
            type: 'number',
            'x-formula': { version: 1, expression: 'rate / 2' },
          },
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                price: { type: 'number' },
                total: {
                  type: 'number',
                  'x-formula': { version: 1, expression: 'price * /rate' },
                },
              },
            },
          },
        },
      };

      const result = validateSchemaFormulas(schema);
      expect(result.isValid).toBe(false);
      expect(result.errors[0]?.error).toContain('Circular dependency');
    });

    it('should not report circular dependency when root path is valid', () => {
      const schema: JsonSchema = {
        type: 'object',
        properties: {
          rate: { type: 'number' },
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                price: { type: 'number' },
                total: {
                  type: 'number',
                  'x-formula': { version: 1, expression: 'price * /rate' },
                },
              },
            },
          },
        },
      };

      const result = validateSchemaFormulas(schema);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('relative path references', () => {
    it('should validate formula with relative path ../field', () => {
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
                tax: {
                  type: 'number',
                  'x-formula': { version: 1, expression: 'price * ../taxRate' },
                },
              },
            },
          },
        },
      };

      const result = validateSchemaFormulas(schema);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect unknown field with relative path', () => {
      const schema: JsonSchema = {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                price: { type: 'number' },
                tax: {
                  type: 'number',
                  'x-formula': { version: 1, expression: 'price * ../unknownRate' },
                },
              },
            },
          },
        },
      };

      const result = validateSchemaFormulas(schema);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]?.error).toBe(
        "Unknown root field 'unknownRate' in formula",
      );
    });

    it('should validate nested relative path like ../config.rate', () => {
      const schema: JsonSchema = {
        type: 'object',
        properties: {
          config: {
            type: 'object',
            properties: {
              rate: { type: 'number' },
            },
          },
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                value: { type: 'number' },
                computed: {
                  type: 'number',
                  'x-formula': { version: 1, expression: 'value * ../config.rate' },
                },
              },
            },
          },
        },
      };

      const result = validateSchemaFormulas(schema);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate multiple level relative path ../../field', () => {
      const schema: JsonSchema = {
        type: 'object',
        properties: {
          globalRate: { type: 'number' },
          categories: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                items: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      price: { type: 'number' },
                      tax: {
                        type: 'number',
                        'x-formula': { version: 1, expression: 'price * ../../globalRate' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      };

      const result = validateSchemaFormulas(schema);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('array evaluation validation (v1.1)', () => {
    it('should allow @prev on computed field (backward reference)', () => {
      const schema: JsonSchema = {
        type: 'object',
        properties: {
          transactions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                amount: { type: 'number' },
                balance: {
                  type: 'number',
                  'x-formula': {
                    version: 1,
                    expression: 'if(#first, amount, @prev.balance + amount)',
                  },
                },
              },
            },
          },
        },
      };

      const result = validateSchemaFormulas(schema);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should allow @prev on regular field', () => {
      const schema: JsonSchema = {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                value: { type: 'number' },
                delta: {
                  type: 'number',
                  'x-formula': {
                    version: 1,
                    expression: 'if(#first, 0, value - @prev.value)',
                  },
                },
              },
            },
          },
        },
      };

      const result = validateSchemaFormulas(schema);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should allow @next on regular field', () => {
      const schema: JsonSchema = {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                value: { type: 'number' },
                nextValue: {
                  type: 'number',
                  'x-formula': {
                    version: 1,
                    expression: 'if(#last, 0, @next.value)',
                  },
                },
              },
            },
          },
        },
      };

      const result = validateSchemaFormulas(schema);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject @next on computed field (forward reference)', () => {
      const schema: JsonSchema = {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                value: { type: 'number' },
                runningTotal: {
                  type: 'number',
                  'x-formula': {
                    version: 1,
                    expression: 'if(#first, value, @prev.runningTotal + value)',
                  },
                },
                lookAhead: {
                  type: 'number',
                  'x-formula': {
                    version: 1,
                    expression: '@next.runningTotal',
                  },
                },
              },
            },
          },
        },
      };

      const result = validateSchemaFormulas(schema);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]?.error).toContain(
        "Cannot reference computed field 'runningTotal' via @next",
      );
    });

    it('should reject absolute index reference to computed field', () => {
      const schema: JsonSchema = {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                value: { type: 'number' },
                computed: {
                  type: 'number',
                  'x-formula': { version: 1, expression: 'value * 2' },
                },
                reference: {
                  type: 'number',
                  'x-formula': { version: 1, expression: '/items[1].computed' },
                },
              },
            },
          },
        },
      };

      const result = validateSchemaFormulas(schema);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]?.error).toContain(
        "Absolute index reference to computed field 'computed'",
      );
    });

    it('should allow absolute index reference to regular field', () => {
      const schema: JsonSchema = {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                value: { type: 'number' },
                firstValue: {
                  type: 'number',
                  'x-formula': { version: 1, expression: '/items[0].value' },
                },
              },
            },
          },
        },
      };

      const result = validateSchemaFormulas(schema);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should skip array validation for formulas outside array context', () => {
      const schema: JsonSchema = {
        type: 'object',
        properties: {
          value: { type: 'number' },
          computed: {
            type: 'number',
            'x-formula': { version: 1, expression: 'value * 2' },
          },
        },
      };

      const result = validateSchemaFormulas(schema);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});
