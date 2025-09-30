import { JsonSchemaTypeName } from '../../types/schema.types.js';
import { rowSchemaHashSchema } from '../row-schema-hash.schema.js';

describe('rowSchemaHashSchema', () => {
  it('should have correct type', () => {
    expect(rowSchemaHashSchema.type).toBe(JsonSchemaTypeName.String);
  });

  it('should have empty string as default', () => {
    expect(rowSchemaHashSchema.default).toBe('');
  });

  it('should be readOnly', () => {
    expect(rowSchemaHashSchema.readOnly).toBe(true);
  });

  it('should match expected structure', () => {
    expect(rowSchemaHashSchema).toStrictEqual({
      type: JsonSchemaTypeName.String,
      default: '',
      readOnly: true,
    });
  });
});
