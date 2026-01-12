import { describe, it, expect } from '@jest/globals';
import { computeValueDiff } from '../computeValueDiff';
import { FieldChangeType } from '../../types/value-diff.types';

describe('computeValueDiff', () => {
  it('returns empty array when both data are null', () => {
    const result = computeValueDiff(null, null);
    expect(result).toEqual([]);
  });

  it('detects entire object as added when fromData is null', () => {
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

  it('detects entire object as removed when toData is null', () => {
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

  it('detects field modifications', () => {
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

  it('detects field additions in existing data', () => {
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

  it('detects field removals in existing data', () => {
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

  it('handles nested objects', () => {
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

  it('handles complex nested objects', () => {
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

  it('handles array values', () => {
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

  it('returns empty array when no changes', () => {
    const fromData = { name: 'John', age: 30 };
    const toData = { name: 'John', age: 30 };
    const result = computeValueDiff(fromData, toData);

    expect(result).toEqual([]);
  });

  it('handles multiple field changes', () => {
    const fromData = { name: 'John', age: 30, city: 'NY' };
    const toData = { name: 'Jane', age: 31, city: 'LA' };
    const result = computeValueDiff(fromData, toData);

    expect(result).toHaveLength(3);
    expect(result.every((r) => r.changeType === FieldChangeType.Modified)).toBe(
      true,
    );
  });

  it('handles boolean values', () => {
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

  it('handles null to value changes', () => {
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

  it('handles value to null changes', () => {
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

  describe('primitive root types', () => {
    it('detects string modification at root level', () => {
      const fromData = 'v2.2.0';
      const toData = 'v2.5.1';
      const result = computeValueDiff(fromData, toData);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        path: '',
        oldValue: 'v2.2.0',
        newValue: 'v2.5.1',
        changeType: FieldChangeType.Modified,
      });
    });

    it('detects number modification at root level', () => {
      const fromData = 42;
      const toData = 100;
      const result = computeValueDiff(fromData, toData);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        path: '',
        oldValue: 42,
        newValue: 100,
        changeType: FieldChangeType.Modified,
      });
    });

    it('detects boolean modification at root level', () => {
      const fromData = true;
      const toData = false;
      const result = computeValueDiff(fromData, toData);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        path: '',
        oldValue: true,
        newValue: false,
        changeType: FieldChangeType.Modified,
      });
    });

    it('returns empty array when primitive values are equal', () => {
      const result = computeValueDiff('same', 'same');
      expect(result).toEqual([]);
    });

    it('handles null to primitive string', () => {
      const result = computeValueDiff(null, 'hello');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        path: '',
        oldValue: null,
        newValue: 'hello',
        changeType: FieldChangeType.Added,
      });
    });

    it('handles primitive string to null', () => {
      const result = computeValueDiff('hello', null);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        path: '',
        oldValue: 'hello',
        newValue: null,
        changeType: FieldChangeType.Removed,
      });
    });

    it('handles root array modification', () => {
      const fromData = ['a', 'b'];
      const toData = ['a', 'b', 'c'];
      const result = computeValueDiff(fromData, toData);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        path: '2',
        oldValue: null,
        newValue: 'c',
        changeType: FieldChangeType.Added,
      });
    });

    it('handles root array element modification', () => {
      const fromData = ['a', 'b'];
      const toData = ['a', 'c'];
      const result = computeValueDiff(fromData, toData);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        path: '1',
        oldValue: 'b',
        newValue: 'c',
        changeType: FieldChangeType.Modified,
      });
    });

    it('handles root array of numbers', () => {
      const fromData = [1, 2, 3];
      const toData = [1, 2, 4];
      const result = computeValueDiff(fromData, toData);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        path: '2',
        oldValue: 3,
        newValue: 4,
        changeType: FieldChangeType.Modified,
      });
    });

    it('handles root array element removal', () => {
      const fromData = ['a', 'b', 'c'];
      const toData = ['a', 'b'];
      const result = computeValueDiff(fromData, toData);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        path: '2',
        oldValue: 'c',
        newValue: null,
        changeType: FieldChangeType.Removed,
      });
    });

    it('handles root array of objects - element added', () => {
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

    it('handles root array of objects - field modified', () => {
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

    it('handles root array of objects - element removed', () => {
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

    it('handles null to root array', () => {
      const fromData = null;
      const toData = [1, 2, 3];
      const result = computeValueDiff(fromData, toData);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        path: '',
        oldValue: null,
        newValue: [1, 2, 3],
        changeType: FieldChangeType.Added,
      });
    });

    it('handles root array to null', () => {
      const fromData = [1, 2, 3];
      const toData = null;
      const result = computeValueDiff(fromData, toData);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        path: '',
        oldValue: [1, 2, 3],
        newValue: null,
        changeType: FieldChangeType.Removed,
      });
    });

    it('returns empty array when root arrays are equal', () => {
      const fromData = [1, 2, 3];
      const toData = [1, 2, 3];
      const result = computeValueDiff(fromData, toData);

      expect(result).toEqual([]);
    });
  });

  describe('type changes', () => {
    it('handles string to object change', () => {
      const fromData = 'hello';
      const toData = { value: 'hello' };
      const result = computeValueDiff(fromData, toData);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        path: '',
        oldValue: 'hello',
        newValue: { value: 'hello' },
        changeType: FieldChangeType.Modified,
      });
    });

    it('handles object to string change', () => {
      const fromData = { value: 'hello' };
      const toData = 'hello';
      const result = computeValueDiff(fromData, toData);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        path: '',
        oldValue: { value: 'hello' },
        newValue: 'hello',
        changeType: FieldChangeType.Modified,
      });
    });

    it('handles array to object change', () => {
      const fromData = [1, 2, 3];
      const toData = { items: [1, 2, 3] };
      const result = computeValueDiff(fromData, toData);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        path: '',
        oldValue: [1, 2, 3],
        newValue: { items: [1, 2, 3] },
        changeType: FieldChangeType.Modified,
      });
    });

    it('handles object to array change', () => {
      const fromData = { items: [1, 2, 3] };
      const toData = [1, 2, 3];
      const result = computeValueDiff(fromData, toData);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        path: '',
        oldValue: { items: [1, 2, 3] },
        newValue: [1, 2, 3],
        changeType: FieldChangeType.Modified,
      });
    });

    it('handles number to array change', () => {
      const fromData = 42;
      const toData = [42];
      const result = computeValueDiff(fromData, toData);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        path: '',
        oldValue: 42,
        newValue: [42],
        changeType: FieldChangeType.Modified,
      });
    });

    it('handles string to array change', () => {
      const fromData = 'hello';
      const toData = ['hello'];
      const result = computeValueDiff(fromData, toData);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        path: '',
        oldValue: 'hello',
        newValue: ['hello'],
        changeType: FieldChangeType.Modified,
      });
    });

    it('handles array to string change', () => {
      const fromData = ['hello'];
      const toData = 'hello';
      const result = computeValueDiff(fromData, toData);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        path: '',
        oldValue: ['hello'],
        newValue: 'hello',
        changeType: FieldChangeType.Modified,
      });
    });
  });

  describe('undefined handling', () => {
    it('treats undefined as truthy value - both undefined returns empty', () => {
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
      const fromData = {};
      const toData = { name: 'John' };
      const result = computeValueDiff(fromData, toData);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        path: 'name',
        oldValue: null,
        newValue: 'John',
        changeType: FieldChangeType.Added,
      });
    });

    it('handles empty array to non-empty array', () => {
      const fromData: unknown[] = [];
      const toData = [1];
      const result = computeValueDiff(fromData, toData);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        path: '0',
        oldValue: null,
        newValue: 1,
        changeType: FieldChangeType.Added,
      });
    });
  });

  describe('deeply nested structures', () => {
    it('handles changes at multiple nesting levels', () => {
      const fromData = { a: { b: { c: 1 } } };
      const toData = { a: { b: { c: 2 } } };
      const result = computeValueDiff(fromData, toData);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        path: 'a.b.c',
        oldValue: 1,
        newValue: 2,
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

  describe('multiple changes', () => {
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

    it('handles mixed add/remove/modify in one diff', () => {
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
  });
});
