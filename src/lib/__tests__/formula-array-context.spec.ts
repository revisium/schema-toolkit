import { JsonSchema } from '../../types/index.js';
import { collectFormulaNodes, evaluateFormulas } from '../formula.js';

describe('array context tokens integration', () => {
  describe('collectFormulaNodes - arrayContext', () => {
    it('should include arrayContext for formula in array item', () => {
      const schema: JsonSchema = {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                value: { type: 'number' },
                position: {
                  type: 'number',
                  readOnly: true,
                  'x-formula': { version: 1, expression: '#index' },
                },
              },
              additionalProperties: false,
              required: ['value', 'position'],
            },
          },
        },
        additionalProperties: false,
        required: ['items'],
      } as JsonSchema;

      const data = {
        items: [
          { value: 10, position: 0 },
          { value: 20, position: 0 },
          { value: 30, position: 0 },
        ],
      };

      const nodes = collectFormulaNodes(schema, data);

      expect(nodes).toHaveLength(3);
      expect(nodes[0]?.arrayContext).toBeDefined();
      expect(nodes[0]?.arrayContext?.levels).toHaveLength(1);
      expect(nodes[0]?.arrayContext?.levels[0]).toMatchObject({
        index: 0,
        length: 3,
      });
      expect(nodes[1]?.arrayContext?.levels[0]).toMatchObject({
        index: 1,
        length: 3,
      });
      expect(nodes[2]?.arrayContext?.levels[0]).toMatchObject({
        index: 2,
        length: 3,
      });
    });

    it('should include nested arrayContext for formula in nested array', () => {
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
                      label: {
                        type: 'string',
                        readOnly: true,
                        'x-formula': { version: 1, expression: 'concat("O", #parent.index, "-I", #index)' },
                      },
                    },
                    additionalProperties: false,
                    required: ['label'],
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
          { items: [{ label: '' }, { label: '' }] },
          { items: [{ label: '' }] },
        ],
      };

      const nodes = collectFormulaNodes(schema, data);

      expect(nodes).toHaveLength(3);

      expect(nodes[0]?.arrayContext?.levels).toHaveLength(2);
      expect(nodes[0]?.arrayContext?.levels[0]).toMatchObject({ index: 0, length: 2 });
      expect(nodes[0]?.arrayContext?.levels[1]).toMatchObject({ index: 0, length: 2 });

      expect(nodes[1]?.arrayContext?.levels[0]).toMatchObject({ index: 1, length: 2 });
      expect(nodes[1]?.arrayContext?.levels[1]).toMatchObject({ index: 0, length: 2 });

      expect(nodes[2]?.arrayContext?.levels[0]).toMatchObject({ index: 0, length: 1 });
      expect(nodes[2]?.arrayContext?.levels[1]).toMatchObject({ index: 1, length: 2 });
    });

    it('should not include arrayContext for formula outside array', () => {
      const schema: JsonSchema = {
        type: 'object',
        properties: {
          value: { type: 'number' },
          doubled: {
            type: 'number',
            readOnly: true,
            'x-formula': { version: 1, expression: 'value * 2' },
          },
        },
        additionalProperties: false,
        required: ['value', 'doubled'],
      } as JsonSchema;

      const nodes = collectFormulaNodes(schema, { value: 10, doubled: 0 });

      expect(nodes).toHaveLength(1);
      expect(nodes[0]?.arrayContext).toBeUndefined();
    });
  });

  describe('evaluateFormulas - #index', () => {
    it('should evaluate #index in array items', () => {
      const schema: JsonSchema = {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                position: {
                  type: 'number',
                  readOnly: true,
                  'x-formula': { version: 1, expression: '#index' },
                },
              },
              additionalProperties: false,
              required: ['position'],
            },
          },
        },
        additionalProperties: false,
        required: ['items'],
      } as JsonSchema;

      const data = {
        items: [{ position: 0 }, { position: 0 }, { position: 0 }],
      };

      const { values, errors } = evaluateFormulas(schema, data);

      expect(errors).toEqual([]);
      expect(values['items[0].position']).toBe(0);
      expect(values['items[1].position']).toBe(1);
      expect(values['items[2].position']).toBe(2);
    });

    it('should evaluate #index + 1 for 1-based position', () => {
      const schema: JsonSchema = {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                position: {
                  type: 'number',
                  readOnly: true,
                  'x-formula': { version: 1, expression: '#index + 1' },
                },
              },
              additionalProperties: false,
              required: ['position'],
            },
          },
        },
        additionalProperties: false,
        required: ['items'],
      } as JsonSchema;

      const data = {
        items: [{ position: 0 }, { position: 0 }, { position: 0 }],
      };

      const { values, errors } = evaluateFormulas(schema, data);

      expect(errors).toEqual([]);
      expect(values['items[0].position']).toBe(1);
      expect(values['items[1].position']).toBe(2);
      expect(values['items[2].position']).toBe(3);
    });
  });

  describe('evaluateFormulas - #length', () => {
    it('should evaluate #length in array items', () => {
      const schema: JsonSchema = {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                totalCount: {
                  type: 'number',
                  readOnly: true,
                  'x-formula': { version: 1, expression: '#length' },
                },
              },
              additionalProperties: false,
              required: ['totalCount'],
            },
          },
        },
        additionalProperties: false,
        required: ['items'],
      } as JsonSchema;

      const data = {
        items: [{ totalCount: 0 }, { totalCount: 0 }, { totalCount: 0 }, { totalCount: 0 }],
      };

      const { values, errors } = evaluateFormulas(schema, data);

      expect(errors).toEqual([]);
      expect(values['items[0].totalCount']).toBe(4);
      expect(values['items[1].totalCount']).toBe(4);
      expect(values['items[2].totalCount']).toBe(4);
      expect(values['items[3].totalCount']).toBe(4);
    });
  });

  describe('evaluateFormulas - #first and #last', () => {
    it('should evaluate #first correctly', () => {
      const schema: JsonSchema = {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                isFirst: {
                  type: 'boolean',
                  readOnly: true,
                  'x-formula': { version: 1, expression: '#first' },
                },
              },
              additionalProperties: false,
              required: ['isFirst'],
            },
          },
        },
        additionalProperties: false,
        required: ['items'],
      } as JsonSchema;

      const data = {
        items: [{ isFirst: false }, { isFirst: false }, { isFirst: false }],
      };

      const { values, errors } = evaluateFormulas(schema, data);

      expect(errors).toEqual([]);
      expect(values['items[0].isFirst']).toBe(true);
      expect(values['items[1].isFirst']).toBe(false);
      expect(values['items[2].isFirst']).toBe(false);
    });

    it('should evaluate #last correctly', () => {
      const schema: JsonSchema = {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                isLast: {
                  type: 'boolean',
                  readOnly: true,
                  'x-formula': { version: 1, expression: '#last' },
                },
              },
              additionalProperties: false,
              required: ['isLast'],
            },
          },
        },
        additionalProperties: false,
        required: ['items'],
      } as JsonSchema;

      const data = {
        items: [{ isLast: false }, { isLast: false }, { isLast: false }],
      };

      const { values, errors } = evaluateFormulas(schema, data);

      expect(errors).toEqual([]);
      expect(values['items[0].isLast']).toBe(false);
      expect(values['items[1].isLast']).toBe(false);
      expect(values['items[2].isLast']).toBe(true);
    });
  });

  describe('evaluateFormulas - @prev and @next', () => {
    it('should evaluate @prev for accessing previous element non-computed field', () => {
      const schema: JsonSchema = {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                value: { type: 'number' },
                prevValue: {
                  type: 'number',
                  readOnly: true,
                  'x-formula': { version: 1, expression: 'if(#first, 0, @prev.value)' },
                },
              },
              additionalProperties: false,
              required: ['value', 'prevValue'],
            },
          },
        },
        additionalProperties: false,
        required: ['items'],
      } as JsonSchema;

      const data = {
        items: [
          { value: 10, prevValue: 0 },
          { value: 20, prevValue: 0 },
          { value: 15, prevValue: 0 },
        ],
      };

      const { values, errors } = evaluateFormulas(schema, data);

      expect(errors).toEqual([]);
      expect(values['items[0].prevValue']).toBe(0);
      expect(values['items[1].prevValue']).toBe(10);
      expect(values['items[2].prevValue']).toBe(20);
    });

    it('should evaluate @prev.value for delta calculation', () => {
      const schema: JsonSchema = {
        type: 'object',
        properties: {
          measurements: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                value: { type: 'number' },
                delta: {
                  type: 'number',
                  readOnly: true,
                  'x-formula': { version: 1, expression: 'if(#first, 0, value - @prev.value)' },
                },
              },
              additionalProperties: false,
              required: ['value', 'delta'],
            },
          },
        },
        additionalProperties: false,
        required: ['measurements'],
      } as JsonSchema;

      const data = {
        measurements: [
          { value: 100, delta: 0 },
          { value: 150, delta: 0 },
          { value: 120, delta: 0 },
        ],
      };

      const { values, errors } = evaluateFormulas(schema, data);

      expect(errors).toEqual([]);
      expect(values['measurements[0].delta']).toBe(0);
      expect(values['measurements[1].delta']).toBe(50);
      expect(values['measurements[2].delta']).toBe(-30);
    });

    it('should evaluate @next for lookahead', () => {
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
                  readOnly: true,
                  'x-formula': { version: 1, expression: 'if(#last, 0, @next.value)' },
                },
              },
              additionalProperties: false,
              required: ['value', 'nextValue'],
            },
          },
        },
        additionalProperties: false,
        required: ['items'],
      } as JsonSchema;

      const data = {
        items: [
          { value: 10, nextValue: 0 },
          { value: 20, nextValue: 0 },
          { value: 30, nextValue: 0 },
        ],
      };

      const { values, errors } = evaluateFormulas(schema, data);

      expect(errors).toEqual([]);
      expect(values['items[0].nextValue']).toBe(20);
      expect(values['items[1].nextValue']).toBe(30);
      expect(values['items[2].nextValue']).toBe(0);
    });
  });

  describe('evaluateFormulas - #parent tokens', () => {
    it('should evaluate #parent.index in nested arrays', () => {
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
                      orderIndex: {
                        type: 'number',
                        readOnly: true,
                        'x-formula': { version: 1, expression: '#parent.index' },
                      },
                      itemIndex: {
                        type: 'number',
                        readOnly: true,
                        'x-formula': { version: 1, expression: '#index' },
                      },
                    },
                    additionalProperties: false,
                    required: ['orderIndex', 'itemIndex'],
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
          { items: [{ orderIndex: 0, itemIndex: 0 }, { orderIndex: 0, itemIndex: 0 }] },
          { items: [{ orderIndex: 0, itemIndex: 0 }] },
        ],
      };

      const { values, errors } = evaluateFormulas(schema, data);

      expect(errors).toEqual([]);
      expect(values['orders[0].items[0].orderIndex']).toBe(0);
      expect(values['orders[0].items[0].itemIndex']).toBe(0);
      expect(values['orders[0].items[1].orderIndex']).toBe(0);
      expect(values['orders[0].items[1].itemIndex']).toBe(1);
      expect(values['orders[1].items[0].orderIndex']).toBe(1);
      expect(values['orders[1].items[0].itemIndex']).toBe(0);
    });

    it('should evaluate #parent.length in nested arrays', () => {
      const schema: JsonSchema = {
        type: 'object',
        properties: {
          groups: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                members: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      totalGroups: {
                        type: 'number',
                        readOnly: true,
                        'x-formula': { version: 1, expression: '#parent.length' },
                      },
                    },
                    additionalProperties: false,
                    required: ['totalGroups'],
                  },
                },
              },
              additionalProperties: false,
              required: ['members'],
            },
          },
        },
        additionalProperties: false,
        required: ['groups'],
      } as JsonSchema;

      const data = {
        groups: [
          { members: [{ totalGroups: 0 }] },
          { members: [{ totalGroups: 0 }] },
          { members: [{ totalGroups: 0 }] },
        ],
      };

      const { values, errors } = evaluateFormulas(schema, data);

      expect(errors).toEqual([]);
      expect(values['groups[0].members[0].totalGroups']).toBe(3);
      expect(values['groups[1].members[0].totalGroups']).toBe(3);
      expect(values['groups[2].members[0].totalGroups']).toBe(3);
    });
  });

  describe('evaluateFormulas - #root tokens', () => {
    it('should evaluate #root.index as topmost array index', () => {
      const schema: JsonSchema = {
        type: 'object',
        properties: {
          level1: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                level2: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      level3: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            rootIdx: {
                              type: 'number',
                              readOnly: true,
                              'x-formula': { version: 1, expression: '#root.index' },
                            },
                            parentIdx: {
                              type: 'number',
                              readOnly: true,
                              'x-formula': { version: 1, expression: '#parent.index' },
                            },
                            currentIdx: {
                              type: 'number',
                              readOnly: true,
                              'x-formula': { version: 1, expression: '#index' },
                            },
                          },
                          additionalProperties: false,
                          required: ['rootIdx', 'parentIdx', 'currentIdx'],
                        },
                      },
                    },
                    additionalProperties: false,
                    required: ['level3'],
                  },
                },
              },
              additionalProperties: false,
              required: ['level2'],
            },
          },
        },
        additionalProperties: false,
        required: ['level1'],
      } as JsonSchema;

      const data = {
        level1: [
          {
            level2: [
              { level3: [{ rootIdx: 0, parentIdx: 0, currentIdx: 0 }] },
            ],
          },
          {
            level2: [
              { level3: [{ rootIdx: 0, parentIdx: 0, currentIdx: 0 }, { rootIdx: 0, parentIdx: 0, currentIdx: 0 }] },
            ],
          },
        ],
      };

      const { values, errors } = evaluateFormulas(schema, data);

      expect(errors).toEqual([]);
      expect(values['level1[0].level2[0].level3[0].rootIdx']).toBe(0);
      expect(values['level1[0].level2[0].level3[0].parentIdx']).toBe(0);
      expect(values['level1[0].level2[0].level3[0].currentIdx']).toBe(0);

      expect(values['level1[1].level2[0].level3[0].rootIdx']).toBe(1);
      expect(values['level1[1].level2[0].level3[0].parentIdx']).toBe(0);
      expect(values['level1[1].level2[0].level3[0].currentIdx']).toBe(0);

      expect(values['level1[1].level2[0].level3[1].rootIdx']).toBe(1);
      expect(values['level1[1].level2[0].level3[1].parentIdx']).toBe(0);
      expect(values['level1[1].level2[0].level3[1].currentIdx']).toBe(1);
    });
  });

  describe('evaluateFormulas - combined tokens', () => {
    it('should combine #index with field values', () => {
      const schema: JsonSchema = {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                price: { type: 'number' },
                weightedPrice: {
                  type: 'number',
                  readOnly: true,
                  'x-formula': { version: 1, expression: 'price * (#index + 1)' },
                },
              },
              additionalProperties: false,
              required: ['price', 'weightedPrice'],
            },
          },
        },
        additionalProperties: false,
        required: ['items'],
      } as JsonSchema;

      const data = {
        items: [
          { price: 10, weightedPrice: 0 },
          { price: 10, weightedPrice: 0 },
          { price: 10, weightedPrice: 0 },
        ],
      };

      const { values, errors } = evaluateFormulas(schema, data);

      expect(errors).toEqual([]);
      expect(values['items[0].weightedPrice']).toBe(10);
      expect(values['items[1].weightedPrice']).toBe(20);
      expect(values['items[2].weightedPrice']).toBe(30);
    });

    it('should generate label with #index and concat', () => {
      const schema: JsonSchema = {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                label: {
                  type: 'string',
                  readOnly: true,
                  'x-formula': { version: 1, expression: 'concat(#index + 1, ". ", name)' },
                },
              },
              additionalProperties: false,
              required: ['name', 'label'],
            },
          },
        },
        additionalProperties: false,
        required: ['items'],
      } as JsonSchema;

      const data = {
        items: [
          { name: 'First', label: '' },
          { name: 'Second', label: '' },
          { name: 'Third', label: '' },
        ],
      };

      const { values, errors } = evaluateFormulas(schema, data);

      expect(errors).toEqual([]);
      expect(values['items[0].label']).toBe('1. First');
      expect(values['items[1].label']).toBe('2. Second');
      expect(values['items[2].label']).toBe('3. Third');
    });

    it('should combine #parent.index and #index for nested label', () => {
      const schema: JsonSchema = {
        type: 'object',
        properties: {
          sections: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                questions: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      number: {
                        type: 'string',
                        readOnly: true,
                        'x-formula': { version: 1, expression: 'concat(#parent.index + 1, ".", #index + 1)' },
                      },
                    },
                    additionalProperties: false,
                    required: ['number'],
                  },
                },
              },
              additionalProperties: false,
              required: ['questions'],
            },
          },
        },
        additionalProperties: false,
        required: ['sections'],
      } as JsonSchema;

      const data = {
        sections: [
          { questions: [{ number: '' }, { number: '' }] },
          { questions: [{ number: '' }, { number: '' }, { number: '' }] },
        ],
      };

      const { values, errors } = evaluateFormulas(schema, data);

      expect(errors).toEqual([]);
      expect(values['sections[0].questions[0].number']).toBe('1.1');
      expect(values['sections[0].questions[1].number']).toBe('1.2');
      expect(values['sections[1].questions[0].number']).toBe('2.1');
      expect(values['sections[1].questions[1].number']).toBe('2.2');
      expect(values['sections[1].questions[2].number']).toBe('2.3');
    });
  });

  describe('edge cases', () => {
    it('should handle empty array', () => {
      const schema: JsonSchema = {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                position: {
                  type: 'number',
                  readOnly: true,
                  'x-formula': { version: 1, expression: '#index' },
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

    it('should handle single element array', () => {
      const schema: JsonSchema = {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                isFirst: {
                  type: 'boolean',
                  readOnly: true,
                  'x-formula': { version: 1, expression: '#first' },
                },
                isLast: {
                  type: 'boolean',
                  readOnly: true,
                  'x-formula': { version: 1, expression: '#last' },
                },
                length: {
                  type: 'number',
                  readOnly: true,
                  'x-formula': { version: 1, expression: '#length' },
                },
              },
              additionalProperties: false,
              required: ['isFirst', 'isLast', 'length'],
            },
          },
        },
        additionalProperties: false,
        required: ['items'],
      } as JsonSchema;

      const data = {
        items: [{ isFirst: false, isLast: false, length: 0 }],
      };

      const { values, errors } = evaluateFormulas(schema, data);

      expect(errors).toEqual([]);
      expect(values['items[0].isFirst']).toBe(true);
      expect(values['items[0].isLast']).toBe(true);
      expect(values['items[0].length']).toBe(1);
    });
  });
});
