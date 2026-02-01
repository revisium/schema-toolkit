import { describe, it, expect } from '@jest/globals';
import { computeValueDiff } from '../computeValueDiff.js';
import { FieldChangeType } from '../types.js';

describe('computeValueDiff - edge cases', () => {
  describe('undefined handling', () => {
    it('treats both undefined as no changes', () => {
      const result = computeValueDiff(undefined, undefined);
      expect(result).toEqual([]);
    });

    it('handles undefined to value as modification', () => {
      const result = computeValueDiff(undefined, 'hello');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        path: '',
        oldValue: undefined,
        newValue: 'hello',
        changeType: FieldChangeType.Modified,
      });
    });

    it('handles value to undefined as modification', () => {
      const result = computeValueDiff('hello', undefined);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        path: '',
        oldValue: 'hello',
        newValue: undefined,
        changeType: FieldChangeType.Modified,
      });
    });

    it('handles null to undefined as addition', () => {
      const result = computeValueDiff(null, undefined);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        path: '',
        oldValue: null,
        newValue: undefined,
        changeType: FieldChangeType.Added,
      });
    });

    it('handles undefined to null as removal', () => {
      const result = computeValueDiff(undefined, null);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        path: '',
        oldValue: undefined,
        newValue: null,
        changeType: FieldChangeType.Removed,
      });
    });
  });

  describe('empty structures', () => {
    it('returns empty array when both are empty objects', () => {
      const result = computeValueDiff({}, {});
      expect(result).toEqual([]);
    });

    it('returns empty array when both are empty arrays', () => {
      const result = computeValueDiff([], []);
      expect(result).toEqual([]);
    });

    it('handles empty object to non-empty object', () => {
      const result = computeValueDiff({}, { name: 'John' });

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        path: 'name',
        oldValue: null,
        newValue: 'John',
        changeType: FieldChangeType.Added,
      });
    });

    it('handles non-empty object to empty object', () => {
      const result = computeValueDiff({ name: 'John' }, {});

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        path: 'name',
        oldValue: 'John',
        newValue: null,
        changeType: FieldChangeType.Removed,
      });
    });

    it('handles empty array to non-empty array', () => {
      const result = computeValueDiff([], [1]);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        path: '0',
        oldValue: null,
        newValue: 1,
        changeType: FieldChangeType.Added,
      });
    });

    it('handles non-empty array to empty array', () => {
      const result = computeValueDiff([1], []);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        path: '0',
        oldValue: 1,
        newValue: null,
        changeType: FieldChangeType.Removed,
      });
    });
  });

  describe('special values', () => {
    it('handles NaN values', () => {
      const result = computeValueDiff({ value: NaN }, { value: NaN });
      expect(result).toEqual([]);
    });

    it('handles Infinity values', () => {
      const result = computeValueDiff({ value: Infinity }, { value: -Infinity });

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        path: 'value',
        oldValue: Infinity,
        newValue: -Infinity,
        changeType: FieldChangeType.Modified,
      });
    });

    it('handles zero and negative zero as different', () => {
      const result = computeValueDiff({ value: 0 }, { value: -0 });
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        path: 'value',
        oldValue: 0,
        newValue: -0,
        changeType: FieldChangeType.Modified,
      });
    });

    it('handles empty string', () => {
      const result = computeValueDiff({ value: '' }, { value: 'text' });

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        path: 'value',
        oldValue: '',
        newValue: 'text',
        changeType: FieldChangeType.Modified,
      });
    });
  });

  describe('deep equality', () => {
    it('considers objects with same properties equal', () => {
      const obj1 = { a: 1, b: { c: 2 } };
      const obj2 = { a: 1, b: { c: 2 } };
      const result = computeValueDiff(obj1, obj2);

      expect(result).toEqual([]);
    });

    it('considers arrays with same elements equal', () => {
      const arr1 = [1, [2, 3], { a: 4 }];
      const arr2 = [1, [2, 3], { a: 4 }];
      const result = computeValueDiff(arr1, arr2);

      expect(result).toEqual([]);
    });
  });
});
