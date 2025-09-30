import { JsonSchemaTypeName } from '../../types/schema.types.js';
import { rowIdSchema } from '../row-id.schema.js';

describe('rowIdSchema', () => {
  it('should have correct type', () => {
    expect(rowIdSchema.type).toBe(JsonSchemaTypeName.String);
  });

  it('should have empty string as default', () => {
    expect(rowIdSchema.default).toBe('');
  });

  it('should be readOnly', () => {
    expect(rowIdSchema.readOnly).toBe(true);
  });

  it('should match expected structure', () => {
    expect(rowIdSchema).toStrictEqual({
      type: JsonSchemaTypeName.String,
      default: '',
      readOnly: true,
    });
  });
});
