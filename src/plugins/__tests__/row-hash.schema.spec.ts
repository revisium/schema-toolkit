import { JsonSchemaTypeName } from '../../types/schema.types.js';
import { rowHashSchema } from '../row-hash.schema.js';

describe('rowHashSchema', () => {
  it('should have correct type', () => {
    expect(rowHashSchema.type).toBe(JsonSchemaTypeName.String);
  });

  it('should have empty string as default', () => {
    expect(rowHashSchema.default).toBe('');
  });

  it('should be readOnly', () => {
    expect(rowHashSchema.readOnly).toBe(true);
  });

  it('should match expected structure', () => {
    expect(rowHashSchema).toStrictEqual({
      type: JsonSchemaTypeName.String,
      default: '',
      readOnly: true,
    });
  });
});
