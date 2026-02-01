import { describe, it, expect } from '@jest/globals';
import { computeValueDiff } from '../computeValueDiff.js';
import { FieldChangeType } from '../types.js';

describe('computeValueDiff', () => {
  describe('null handling', () => {
    it('returns empty array when both data are null', () => {
      const result = computeValueDiff(null, null);
      expect(result).toEqual([]);
    });

    it('detects entire value as added when fromData is null', () => {
      const toData = { name: 'John', age: 30 };
      const result = computeValueDiff(null, toData);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        path: '',
        oldValue: null,
        newValue: toData,
        changeType: FieldChangeType.Added,
      });
    });

    it('detects entire value as removed when toData is null', () => {
      const fromData = { name: 'John', age: 30 };
      const result = computeValueDiff(fromData, null);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        path: '',
        oldValue: fromData,
        newValue: null,
        changeType: FieldChangeType.Removed,
      });
    });
  });

  describe('field modifications', () => {
    it('detects field modification', () => {
      const fromData = { name: 'John', age: 30 };
      const toData = { name: 'Jane', age: 30 };
      const result = computeValueDiff(fromData, toData);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        path: 'name',
        oldValue: 'John',
        newValue: 'Jane',
        changeType: FieldChangeType.Modified,
      });
    });

    it('detects field addition', () => {
      const fromData = { name: 'John' };
      const toData = { name: 'John', age: 30 };
      const result = computeValueDiff(fromData, toData);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        path: 'age',
        oldValue: null,
        newValue: 30,
        changeType: FieldChangeType.Added,
      });
    });

    it('detects field removal', () => {
      const fromData = { name: 'John', age: 30 };
      const toData = { name: 'John' };
      const result = computeValueDiff(fromData, toData);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        path: 'age',
        oldValue: 30,
        newValue: null,
        changeType: FieldChangeType.Removed,
      });
    });

    it('handles boolean value change', () => {
      const fromData = { active: true };
      const toData = { active: false };
      const result = computeValueDiff(fromData, toData);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        path: 'active',
        oldValue: true,
        newValue: false,
        changeType: FieldChangeType.Modified,
      });
    });

    it('handles null to value change', () => {
      const fromData = { name: null };
      const toData = { name: 'John' };
      const result = computeValueDiff(fromData, toData);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        path: 'name',
        oldValue: null,
        newValue: 'John',
      });
    });

    it('handles value to null change', () => {
      const fromData = { name: 'John' };
      const toData = { name: null };
      const result = computeValueDiff(fromData, toData);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        path: 'name',
        oldValue: 'John',
        newValue: null,
      });
    });
  });

  describe('nested objects', () => {
    it('handles nested object modification', () => {
      const fromData = { user: { name: 'John', age: 30 } };
      const toData = { user: { name: 'Jane', age: 30 } };
      const result = computeValueDiff(fromData, toData);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        path: 'user.name',
        oldValue: 'John',
        newValue: 'Jane',
        changeType: FieldChangeType.Modified,
      });
    });

    it('handles deeply nested modification', () => {
      const fromData = {
        user: {
          profile: {
            name: 'John',
            email: 'john@example.com',
          },
        },
      };
      const toData = {
        user: {
          profile: {
            name: 'Jane',
            email: 'john@example.com',
          },
        },
      };
      const result = computeValueDiff(fromData, toData);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        path: 'user.profile.name',
        oldValue: 'John',
        newValue: 'Jane',
        changeType: FieldChangeType.Modified,
      });
    });

    it('handles addition in deeply nested structure', () => {
      const fromData = { a: { b: {} } };
      const toData = { a: { b: { c: 1 } } };
      const result = computeValueDiff(fromData, toData);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        path: 'a.b.c',
        oldValue: null,
        newValue: 1,
        changeType: FieldChangeType.Added,
      });
    });

    it('handles removal in deeply nested structure', () => {
      const fromData = { a: { b: { c: 1 } } };
      const toData = { a: { b: {} } };
      const result = computeValueDiff(fromData, toData);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        path: 'a.b.c',
        oldValue: 1,
        newValue: null,
        changeType: FieldChangeType.Removed,
      });
    });
  });

  describe('arrays', () => {
    it('handles array element addition', () => {
      const fromData = { tags: ['a', 'b'] };
      const toData = { tags: ['a', 'b', 'c'] };
      const result = computeValueDiff(fromData, toData);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        path: 'tags.2',
        oldValue: null,
        newValue: 'c',
        changeType: FieldChangeType.Added,
      });
    });

    it('handles array element removal', () => {
      const fromData = { tags: ['a', 'b', 'c'] };
      const toData = { tags: ['a', 'b'] };
      const result = computeValueDiff(fromData, toData);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        path: 'tags.2',
        oldValue: 'c',
        newValue: null,
        changeType: FieldChangeType.Removed,
      });
    });

    it('handles array element modification', () => {
      const fromData = { tags: ['a', 'b'] };
      const toData = { tags: ['a', 'c'] };
      const result = computeValueDiff(fromData, toData);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        path: 'tags.1',
        oldValue: 'b',
        newValue: 'c',
        changeType: FieldChangeType.Modified,
      });
    });

    it('handles array of objects - field modified', () => {
      const fromData = [{ id: 1, name: 'a' }];
      const toData = [{ id: 1, name: 'b' }];
      const result = computeValueDiff(fromData, toData);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        path: '0.name',
        oldValue: 'a',
        newValue: 'b',
        changeType: FieldChangeType.Modified,
      });
    });

    it('handles array of objects - element added', () => {
      const fromData = [{ id: 1, name: 'a' }];
      const toData = [
        { id: 1, name: 'a' },
        { id: 2, name: 'b' },
      ];
      const result = computeValueDiff(fromData, toData);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        path: '1',
        oldValue: null,
        newValue: { id: 2, name: 'b' },
        changeType: FieldChangeType.Added,
      });
    });

    it('handles array of objects - element removed', () => {
      const fromData = [{ id: 1 }, { id: 2 }];
      const toData = [{ id: 1 }];
      const result = computeValueDiff(fromData, toData);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        path: '1',
        oldValue: { id: 2 },
        newValue: null,
        changeType: FieldChangeType.Removed,
      });
    });
  });

  describe('no changes', () => {
    it('returns empty array when objects are equal', () => {
      const fromData = { name: 'John', age: 30 };
      const toData = { name: 'John', age: 30 };
      const result = computeValueDiff(fromData, toData);

      expect(result).toEqual([]);
    });

    it('returns empty array when arrays are equal', () => {
      const fromData = [1, 2, 3];
      const toData = [1, 2, 3];
      const result = computeValueDiff(fromData, toData);

      expect(result).toEqual([]);
    });

    it('returns empty array when primitives are equal', () => {
      const result = computeValueDiff('same', 'same');
      expect(result).toEqual([]);
    });
  });

  describe('multiple changes', () => {
    it('handles multiple field changes', () => {
      const fromData = { name: 'John', age: 30, city: 'NY' };
      const toData = { name: 'Jane', age: 31, city: 'LA' };
      const result = computeValueDiff(fromData, toData);

      expect(result).toHaveLength(3);
      expect(
        result.every((r) => r.changeType === FieldChangeType.Modified),
      ).toBe(true);
    });

    it('handles mixed add/remove/modify', () => {
      const fromData = { a: 1, b: 2, c: 3 };
      const toData = { a: 10, c: 3, d: 4 };
      const result = computeValueDiff(fromData, toData);

      expect(result).toHaveLength(3);
      expect(result).toContainEqual({
        path: 'a',
        oldValue: 1,
        newValue: 10,
        changeType: FieldChangeType.Modified,
      });
      expect(result).toContainEqual({
        path: 'b',
        oldValue: 2,
        newValue: null,
        changeType: FieldChangeType.Removed,
      });
      expect(result).toContainEqual({
        path: 'd',
        oldValue: null,
        newValue: 4,
        changeType: FieldChangeType.Added,
      });
    });

    it('handles multiple changes in array of objects', () => {
      const fromData = [
        { id: 1, name: 'a' },
        { id: 2, name: 'b' },
      ];
      const toData = [
        { id: 1, name: 'x' },
        { id: 2, name: 'y' },
      ];
      const result = computeValueDiff(fromData, toData);

      expect(result).toHaveLength(2);
      expect(result).toContainEqual({
        path: '0.name',
        oldValue: 'a',
        newValue: 'x',
        changeType: FieldChangeType.Modified,
      });
      expect(result).toContainEqual({
        path: '1.name',
        oldValue: 'b',
        newValue: 'y',
        changeType: FieldChangeType.Modified,
      });
    });
  });
});
