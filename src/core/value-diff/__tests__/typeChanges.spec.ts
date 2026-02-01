import { describe, it, expect } from '@jest/globals';
import { computeValueDiff } from '../computeValueDiff.js';
import { FieldChangeType } from '../types.js';

describe('computeValueDiff - type changes', () => {
  it('handles string to object change', () => {
    const result = computeValueDiff('hello', { value: 'hello' });

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      path: '',
      oldValue: 'hello',
      newValue: { value: 'hello' },
      changeType: FieldChangeType.Modified,
    });
  });

  it('handles object to string change', () => {
    const result = computeValueDiff({ value: 'hello' }, 'hello');

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      path: '',
      oldValue: { value: 'hello' },
      newValue: 'hello',
      changeType: FieldChangeType.Modified,
    });
  });

  it('handles array to object change', () => {
    const result = computeValueDiff([1, 2, 3], { items: [1, 2, 3] });

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      path: '',
      oldValue: [1, 2, 3],
      newValue: { items: [1, 2, 3] },
      changeType: FieldChangeType.Modified,
    });
  });

  it('handles object to array change', () => {
    const result = computeValueDiff({ items: [1, 2, 3] }, [1, 2, 3]);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      path: '',
      oldValue: { items: [1, 2, 3] },
      newValue: [1, 2, 3],
      changeType: FieldChangeType.Modified,
    });
  });

  it('handles number to array change', () => {
    const result = computeValueDiff(42, [42]);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      path: '',
      oldValue: 42,
      newValue: [42],
      changeType: FieldChangeType.Modified,
    });
  });

  it('handles string to array change', () => {
    const result = computeValueDiff('hello', ['hello']);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      path: '',
      oldValue: 'hello',
      newValue: ['hello'],
      changeType: FieldChangeType.Modified,
    });
  });

  it('handles array to string change', () => {
    const result = computeValueDiff(['hello'], 'hello');

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      path: '',
      oldValue: ['hello'],
      newValue: 'hello',
      changeType: FieldChangeType.Modified,
    });
  });
});
