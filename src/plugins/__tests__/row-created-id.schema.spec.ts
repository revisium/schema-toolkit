import { JsonSchemaTypeName } from '../../types/schema.types.js';
import { rowCreatedIdSchema } from '../row-created-id.schema.js';

describe('rowCreatedIdSchema', () => {
  it('should have correct type', () => {
    expect(rowCreatedIdSchema.type).toBe(JsonSchemaTypeName.String);
  });

  it('should have empty string as default', () => {
    expect(rowCreatedIdSchema.default).toBe('');
  });

  it('should be readOnly', () => {
    expect(rowCreatedIdSchema.readOnly).toBe(true);
  });

  it('should match expected structure', () => {
    expect(rowCreatedIdSchema).toStrictEqual({
      type: JsonSchemaTypeName.String,
      default: '',
      readOnly: true,
    });
  });
});
