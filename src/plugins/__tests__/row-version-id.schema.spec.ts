import { rowVersionIdSchema } from '../row-version-id.schema.js';

describe('rowVersionIdSchema', () => {
  it('should have correct type', () => {
    expect(rowVersionIdSchema.type).toBe('string');
  });

  it('should have empty string as default', () => {
    expect(rowVersionIdSchema.default).toBe('');
  });

  it('should be readOnly', () => {
    expect(rowVersionIdSchema.readOnly).toBe(true);
  });

  it('should match expected structure', () => {
    expect(rowVersionIdSchema).toStrictEqual({
      type: 'string',
      default: '',
      readOnly: true,
    });
  });
});
