import { JsonSchemaTypeName } from '../../types/schema.types.js';
import { rowCreatedAtSchema } from '../row-created-at.schema.js';

describe('rowCreatedAtSchema', () => {
  it('should have correct type', () => {
    expect(rowCreatedAtSchema.type).toBe(JsonSchemaTypeName.String);
  });

  it('should have empty string as default', () => {
    expect(rowCreatedAtSchema.default).toBe('');
  });

  it('should be readOnly', () => {
    expect(rowCreatedAtSchema.readOnly).toBe(true);
  });

  it('should match expected structure', () => {
    expect(rowCreatedAtSchema).toStrictEqual({
      type: JsonSchemaTypeName.String,
      default: '',
      readOnly: true,
    });
  });
});
