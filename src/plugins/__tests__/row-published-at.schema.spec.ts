import { JsonSchemaTypeName } from '../../types/schema.types.js';
import { rowPublishedAtSchema } from '../row-published-at.schema.js';

describe('rowPublishedAtSchema', () => {
  it('should have correct type', () => {
    expect(rowPublishedAtSchema.type).toBe(JsonSchemaTypeName.String);
  });

  it('should have empty string as default', () => {
    expect(rowPublishedAtSchema.default).toBe('');
  });

  it('should not be readOnly', () => {
    expect(rowPublishedAtSchema.readOnly).toBeUndefined();
  });

  it('should match expected structure', () => {
    expect(rowPublishedAtSchema).toStrictEqual({
      type: JsonSchemaTypeName.String,
      default: '',
    });
  });
});
