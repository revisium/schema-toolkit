import { JsonObjectSchema } from '../../types/schema.types.js';
import { calculateSchemaWeight } from '../calculateSchemaWeight.js';

describe('calculateSchemaWeight', () => {
  it('should return zero for empty schema', () => {
    const schema: JsonObjectSchema = {
      type: 'object',
      properties: {},
      additionalProperties: false,
      required: [],
    };

    const result = calculateSchemaWeight(schema);

    expect(result).toEqual({
      totalFields: 0,
      maxDepth: 0,
      fieldNames: 0,
      totalArrays: 0,
      maxArrayDepth: 0,
    });
  });

  it('should count flat properties', () => {
    const schema: JsonObjectSchema = {
      type: 'object',
      properties: {
        name: { type: 'string', default: '' },
        age: { type: 'number', default: 0 },
        active: { type: 'boolean', default: false },
      },
      additionalProperties: false,
      required: ['name', 'age', 'active'],
    };

    const result = calculateSchemaWeight(schema);

    expect(result).toEqual({
      totalFields: 3,
      maxDepth: 1,
      fieldNames: 13,
      totalArrays: 0,
      maxArrayDepth: 0,
    });
  });

  it('should count nested object fields', () => {
    const schema: JsonObjectSchema = {
      type: 'object',
      properties: {
        address: {
          type: 'object',
          properties: {
            city: { type: 'string', default: '' },
            zip: { type: 'string', default: '' },
          },
          additionalProperties: false,
          required: ['city', 'zip'],
        },
      },
      additionalProperties: false,
      required: ['address'],
    };

    const result = calculateSchemaWeight(schema);

    expect(result).toEqual({
      totalFields: 3,
      maxDepth: 2,
      fieldNames: 14,
      totalArrays: 0,
      maxArrayDepth: 0,
    });
  });

  it('should handle deeply nested objects', () => {
    const schema: JsonObjectSchema = {
      type: 'object',
      properties: {
        a: {
          type: 'object',
          properties: {
            b: {
              type: 'object',
              properties: {
                c: { type: 'string', default: '' },
              },
              additionalProperties: false,
              required: ['c'],
            },
          },
          additionalProperties: false,
          required: ['b'],
        },
      },
      additionalProperties: false,
      required: ['a'],
    };

    const result = calculateSchemaWeight(schema);

    expect(result).toEqual({
      totalFields: 3,
      maxDepth: 3,
      fieldNames: 3,
      totalArrays: 0,
      maxArrayDepth: 0,
    });
  });

  it('should count $ref as a field but not traverse it', () => {
    const schema: JsonObjectSchema = {
      type: 'object',
      properties: {
        name: { type: 'string', default: '' },
        related: { $ref: 'other-table' },
      },
      additionalProperties: false,
      required: ['name', 'related'],
    };

    const result = calculateSchemaWeight(schema);

    expect(result).toEqual({
      totalFields: 2,
      maxDepth: 1,
      fieldNames: 11,
      totalArrays: 0,
      maxArrayDepth: 0,
    });
  });

  it('should traverse array items with object schema', () => {
    const schema: JsonObjectSchema = {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string', default: '' },
              price: { type: 'number', default: 0 },
            },
            additionalProperties: false,
            required: ['title', 'price'],
          },
        },
      },
      additionalProperties: false,
      required: ['items'],
    };

    const result = calculateSchemaWeight(schema);

    expect(result).toEqual({
      totalFields: 3,
      maxDepth: 3,
      fieldNames: 15,
      totalArrays: 1,
      maxArrayDepth: 1,
    });
  });

  it('should handle array with primitive items', () => {
    const schema: JsonObjectSchema = {
      type: 'object',
      properties: {
        tags: {
          type: 'array',
          items: { type: 'string', default: '' },
        },
      },
      additionalProperties: false,
      required: ['tags'],
    };

    const result = calculateSchemaWeight(schema);

    expect(result).toEqual({
      totalFields: 1,
      maxDepth: 2,
      fieldNames: 4,
      totalArrays: 1,
      maxArrayDepth: 1,
    });
  });

  it('should sum field name lengths with long names', () => {
    const schema: JsonObjectSchema = {
      type: 'object',
      properties: {
        x: { type: 'string', default: '' },
        longFieldName: { type: 'string', default: '' },
        anotherLongFieldName: { type: 'number', default: 0 },
      },
      additionalProperties: false,
      required: ['x', 'longFieldName', 'anotherLongFieldName'],
    };

    const result = calculateSchemaWeight(schema);

    expect(result).toEqual({
      totalFields: 3,
      maxDepth: 1,
      fieldNames: 34,
      totalArrays: 0,
      maxArrayDepth: 0,
    });
  });

  it('should count multiple arrays at same level', () => {
    const schema: JsonObjectSchema = {
      type: 'object',
      properties: {
        tags: {
          type: 'array',
          items: { type: 'string', default: '' },
        },
        scores: {
          type: 'array',
          items: { type: 'number', default: 0 },
        },
      },
      additionalProperties: false,
      required: ['tags', 'scores'],
    };

    const result = calculateSchemaWeight(schema);

    expect(result).toEqual({
      totalFields: 2,
      maxDepth: 2,
      fieldNames: 10,
      totalArrays: 2,
      maxArrayDepth: 1,
    });
  });

  it('should track nested array depth', () => {
    const schema: JsonObjectSchema = {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              tags: {
                type: 'array',
                items: { type: 'string', default: '' },
              },
            },
            additionalProperties: false,
            required: ['tags'],
          },
        },
      },
      additionalProperties: false,
      required: ['items'],
    };

    const result = calculateSchemaWeight(schema);

    expect(result).toEqual({
      totalFields: 2,
      maxDepth: 4,
      fieldNames: 9,
      totalArrays: 2,
      maxArrayDepth: 2,
    });
  });

  it('should track deeply nested arrays', () => {
    const schema: JsonObjectSchema = {
      type: 'object',
      properties: {
        l1: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              l2: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    l3: {
                      type: 'array',
                      items: { type: 'string', default: '' },
                    },
                  },
                  additionalProperties: false,
                  required: ['l3'],
                },
              },
            },
            additionalProperties: false,
            required: ['l2'],
          },
        },
      },
      additionalProperties: false,
      required: ['l1'],
    };

    const result = calculateSchemaWeight(schema);

    expect(result).toEqual({
      totalFields: 3,
      maxDepth: 6,
      fieldNames: 6,
      totalArrays: 3,
      maxArrayDepth: 3,
    });
  });
});
