import { rowSchemaHashSchema } from '../row-schema-hash.schema.js';

describe('rowSchemaHashSchema', () => {
  it('should have correct type', () => {
    expect(rowSchemaHashSchema.type).toBe('string');
  });

  it('should have empty string as default', () => {
    expect(rowSchemaHashSchema.default).toBe('');
  });

  it('should be readOnly', () => {
    expect(rowSchemaHashSchema.readOnly).toBe(true);
  });

  it('should match expected structure', () => {
    expect(rowSchemaHashSchema).toStrictEqual({
      type: 'string',
      default: '',
      readOnly: true,
    });
  });
});
