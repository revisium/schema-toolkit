import { JsonSchemaTypeName } from '../../types/schema.types.js';
import { rowVersionIdSchema } from '../row-version-id.schema.js';

describe('rowVersionIdSchema', () => {
  it('should have correct type', () => {
    expect(rowVersionIdSchema.type).toBe(JsonSchemaTypeName.String);
  });

  it('should have empty string as default', () => {
    expect(rowVersionIdSchema.default).toBe('');
  });

  it('should be readOnly', () => {
    expect(rowVersionIdSchema.readOnly).toBe(true);
  });

  it('should match expected structure', () => {
    expect(rowVersionIdSchema).toStrictEqual({
      type: JsonSchemaTypeName.String,
      default: '',
      readOnly: true,
    });
  });
});
