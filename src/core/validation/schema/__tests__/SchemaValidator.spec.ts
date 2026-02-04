import { describe, it, expect } from '@jest/globals';
import { createSchemaModel } from '../../../../model/schema-model/index.js';
import { obj, str } from '../../../../mocks/schema.mocks.js';

describe('SchemaValidator', () => {
  describe('foreignKey validation', () => {
    it('returns error for empty foreignKey', () => {
      const schema = obj({
        categoryId: str({ foreignKey: '' }),
      });

      const model = createSchemaModel(schema);
      const errors = model.validationErrors;

      expect(errors).toHaveLength(1);
      expect(errors[0]?.type).toBe('empty-foreign-key');
      expect(errors[0]?.message).toContain('Foreign key');
    });

    it('does not return error for non-empty foreignKey', () => {
      const schema = obj({
        categoryId: str({ foreignKey: 'categories' }),
      });

      const model = createSchemaModel(schema);
      const errors = model.validationErrors;

      expect(errors).toHaveLength(0);
    });

    it('does not return error for field without foreignKey', () => {
      const schema = obj({
        name: str(),
      });

      const model = createSchemaModel(schema);
      const errors = model.validationErrors;

      expect(errors).toHaveLength(0);
    });
  });
});
