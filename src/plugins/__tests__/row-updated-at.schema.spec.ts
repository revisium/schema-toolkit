import { rowUpdatedAtSchema } from '../row-updated-at.schema.js';

describe('rowUpdatedAtSchema', () => {
  it('should have correct type', () => {
    expect(rowUpdatedAtSchema.type).toBe('string');
  });

  it('should have empty string as default', () => {
    expect(rowUpdatedAtSchema.default).toBe('');
  });

  it('should be readOnly', () => {
    expect(rowUpdatedAtSchema.readOnly).toBe(true);
  });

  it('should match expected structure', () => {
    expect(rowUpdatedAtSchema).toStrictEqual({
      type: 'string',
      default: '',
      readOnly: true,
    });
  });
});
