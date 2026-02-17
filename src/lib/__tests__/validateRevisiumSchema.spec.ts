import { JsonObjectSchema } from '../../types/schema.types.js';
import { validateRevisiumSchema } from '../validateRevisiumSchema.js';

describe('validateRevisiumSchema', () => {
  it('should validate a correct schema', () => {
    const schema: JsonObjectSchema = {
      type: 'object',
      properties: {
        name: { type: 'string', default: '' },
        age: { type: 'number', default: 0 },
      },
      additionalProperties: false,
      required: ['name', 'age'],
    };

    const result = validateRevisiumSchema(schema);

    expect(result.valid).toBe(true);
    expect(result.errors).toBeUndefined();
  });

  it('should reject schema with missing required fields', () => {
    const schema = {
      type: 'object',
      properties: {
        name: { type: 'string' },
      },
      additionalProperties: false,
      required: ['name'],
    } as unknown as JsonObjectSchema;

    const result = validateRevisiumSchema(schema);

    expect(result.valid).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors!.length).toBeGreaterThan(0);
  });

  it('should validate schema with nested objects', () => {
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

    const result = validateRevisiumSchema(schema);

    expect(result.valid).toBe(true);
  });

  it('should validate schema with arrays', () => {
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

    const result = validateRevisiumSchema(schema);

    expect(result.valid).toBe(true);
  });

  it('should validate schema with boolean fields', () => {
    const schema: JsonObjectSchema = {
      type: 'object',
      properties: {
        active: { type: 'boolean', default: false },
      },
      additionalProperties: false,
      required: ['active'],
    };

    const result = validateRevisiumSchema(schema);

    expect(result.valid).toBe(true);
  });

  it('should validate schema with $ref', () => {
    const schema: JsonObjectSchema = {
      type: 'object',
      properties: {
        related: { $ref: 'other-table' },
      },
      additionalProperties: false,
      required: ['related'],
    };

    const result = validateRevisiumSchema(schema);

    expect(result.valid).toBe(true);
  });

  it('should reject schema with invalid type', () => {
    const schema = {
      type: 'object',
      properties: {
        field: { type: 'invalid', default: '' },
      },
      additionalProperties: false,
      required: ['field'],
    } as unknown as JsonObjectSchema;

    const result = validateRevisiumSchema(schema);

    expect(result.valid).toBe(false);
    expect(result.errors).toBeDefined();
  });

  it('should validate schema with string pattern', () => {
    const schema: JsonObjectSchema = {
      type: 'object',
      properties: {
        email: {
          type: 'string',
          default: '',
          pattern: '^[a-z]+$',
        },
      },
      additionalProperties: false,
      required: ['email'],
    };

    const result = validateRevisiumSchema(schema);

    expect(result.valid).toBe(true);
  });

  it('should reject schema with invalid regex pattern', () => {
    const schema: JsonObjectSchema = {
      type: 'object',
      properties: {
        field: {
          type: 'string',
          default: '',
          pattern: '[invalid',
        },
      },
      additionalProperties: false,
      required: ['field'],
    };

    const result = validateRevisiumSchema(schema);

    expect(result.valid).toBe(false);
    expect(result.errors).toBeDefined();
  });

  it('should validate schema with x-formula', () => {
    const schema: JsonObjectSchema = {
      type: 'object',
      properties: {
        price: { type: 'number', default: 0 },
        tax: {
          type: 'number',
          default: 0,
          readOnly: true,
          'x-formula': { version: 1, expression: 'price * 0.1' },
        },
      },
      additionalProperties: false,
      required: ['price', 'tax'],
    };

    const result = validateRevisiumSchema(schema);

    expect(result.valid).toBe(true);
  });

  it('should format error messages with instancePath', () => {
    const schema = {
      type: 'object',
      properties: {
        name: { type: 'string' },
      },
      additionalProperties: false,
      required: ['name'],
    } as unknown as JsonObjectSchema;

    const result = validateRevisiumSchema(schema);

    expect(result.valid).toBe(false);
    expect(result.errors).toBeDefined();
    for (const error of result.errors!) {
      expect(typeof error).toBe('string');
      expect(error).toContain(':');
    }
  });

  it('should validate schema with foreignKey', () => {
    const schema: JsonObjectSchema = {
      type: 'object',
      properties: {
        authorId: {
          type: 'string',
          default: '',
          foreignKey: 'authors',
        },
      },
      additionalProperties: false,
      required: ['authorId'],
    };

    const result = validateRevisiumSchema(schema);

    expect(result.valid).toBe(true);
  });

  it('should return same result on repeated calls (singleton validator)', () => {
    const schema: JsonObjectSchema = {
      type: 'object',
      properties: {
        name: { type: 'string', default: '' },
      },
      additionalProperties: false,
      required: ['name'],
    };

    const result1 = validateRevisiumSchema(schema);
    const result2 = validateRevisiumSchema(schema);

    expect(result1.valid).toBe(true);
    expect(result2.valid).toBe(true);
  });
});
