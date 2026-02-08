import { rowCreatedAtSchema } from '../row-created-at.schema.js';

describe('rowCreatedAtSchema', () => {
  it('should have correct type', () => {
    expect(rowCreatedAtSchema.type).toBe('string');
  });

  it('should have empty string as default', () => {
    expect(rowCreatedAtSchema.default).toBe('');
  });

  it('should be readOnly', () => {
    expect(rowCreatedAtSchema.readOnly).toBe(true);
  });

  it('should match expected structure', () => {
    expect(rowCreatedAtSchema).toStrictEqual({
      type: 'string',
      default: '',
      readOnly: true,
    });
  });
});
