import { describe, it, expect } from '@jest/globals';
import { createSchemaModel } from '../../../../model/schema-model/index.js';
import { JsonSchemaTypeName, type JsonObjectSchema } from '../../../../types/index.js';

describe('SchemaValidator', () => {
  describe('foreignKey validation', () => {
    it('returns error for empty foreignKey', () => {
      const schema: JsonObjectSchema = {
        type: JsonSchemaTypeName.Object,
        additionalProperties: false,
        required: ['categoryId'],
        properties: {
          categoryId: {
            type: JsonSchemaTypeName.String,
            default: '',
            foreignKey: '',
          },
        },
      };

      const model = createSchemaModel(schema);
      const errors = model.validationErrors;

      expect(errors).toHaveLength(1);
      expect(errors[0]?.type).toBe('empty-foreign-key');
      expect(errors[0]?.message).toContain('Foreign key');
    });

    it('does not return error for non-empty foreignKey', () => {
      const schema: JsonObjectSchema = {
        type: JsonSchemaTypeName.Object,
        additionalProperties: false,
        required: ['categoryId'],
        properties: {
          categoryId: {
            type: JsonSchemaTypeName.String,
            default: '',
            foreignKey: 'categories',
          },
        },
      };

      const model = createSchemaModel(schema);
      const errors = model.validationErrors;

      expect(errors).toHaveLength(0);
    });

    it('does not return error for field without foreignKey', () => {
      const schema: JsonObjectSchema = {
        type: JsonSchemaTypeName.Object,
        additionalProperties: false,
        required: ['name'],
        properties: {
          name: {
            type: JsonSchemaTypeName.String,
            default: '',
          },
        },
      };

      const model = createSchemaModel(schema);
      const errors = model.validationErrors;

      expect(errors).toHaveLength(0);
    });
  });
});
