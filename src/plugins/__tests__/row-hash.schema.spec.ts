import { rowHashSchema } from '../row-hash.schema.js';

describe('rowHashSchema', () => {
  it('should have correct type', () => {
    expect(rowHashSchema.type).toBe('string');
  });

  it('should have empty string as default', () => {
    expect(rowHashSchema.default).toBe('');
  });

  it('should be readOnly', () => {
    expect(rowHashSchema.readOnly).toBe(true);
  });

  it('should match expected structure', () => {
    expect(rowHashSchema).toStrictEqual({
      type: 'string',
      default: '',
      readOnly: true,
    });
  });
});
