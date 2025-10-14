import { describe, it, expect } from '@jest/globals';
import { JsonValue } from '../../types';
import {
  parsePath,
  getValueByPath,
  setValueByPath,
  hasPath,
  deepEqual,
} from '../json-path-utils.js';

describe('parsePath', () => {
  it('parses simple field', () => {
    expect(parsePath('title')).toEqual(['title']);
  });

  it('parses nested field', () => {
    expect(parsePath('address.city')).toEqual(['address', 'city']);
  });

  it('parses array index', () => {
    expect(parsePath('tags[0]')).toEqual(['tags', 0]);
  });

  it('parses nested array field', () => {
    expect(parsePath('users[0].name')).toEqual(['users', 0, 'name']);
  });

  it('parses nested arrays', () => {
    expect(parsePath('matrix[0][1]')).toEqual(['matrix', 0, 1]);
  });

  it('parses deep nested path', () => {
    expect(parsePath('a.b.c.d')).toEqual(['a', 'b', 'c', 'd']);
  });

  it('parses mixed complex path', () => {
    expect(parsePath('data[0].items[1].value')).toEqual([
      'data',
      0,
      'items',
      1,
      'value',
    ]);
  });

  it('handles empty path', () => {
    expect(parsePath('')).toEqual([]);
  });
});

describe('getValueByPath', () => {
  const obj = {
    title: 'Article',
    address: { city: 'Moscow', country: 'Russia' },
    tags: ['a', 'b', 'c'],
    users: [
      { name: 'John', age: 30 },
      { name: 'Jane', age: 25 },
    ],
    matrix: [
      [1, 2],
      [3, 4],
    ],
  };

  it('gets simple field', () => {
    expect(getValueByPath(obj, 'title')).toBe('Article');
  });

  it('gets nested field', () => {
    expect(getValueByPath(obj, 'address.city')).toBe('Moscow');
    expect(getValueByPath(obj, 'address.country')).toBe('Russia');
  });

  it('gets array element', () => {
    expect(getValueByPath(obj, 'tags[0]')).toBe('a');
    expect(getValueByPath(obj, 'tags[1]')).toBe('b');
    expect(getValueByPath(obj, 'tags[2]')).toBe('c');
  });

  it('gets nested array field', () => {
    expect(getValueByPath(obj, 'users[0].name')).toBe('John');
    expect(getValueByPath(obj, 'users[0].age')).toBe(30);
    expect(getValueByPath(obj, 'users[1].name')).toBe('Jane');
  });

  it('gets nested array element', () => {
    expect(getValueByPath(obj, 'matrix[0][0]')).toBe(1);
    expect(getValueByPath(obj, 'matrix[0][1]')).toBe(2);
    expect(getValueByPath(obj, 'matrix[1][0]')).toBe(3);
    expect(getValueByPath(obj, 'matrix[1][1]')).toBe(4);
  });

  it('gets whole object', () => {
    expect(getValueByPath(obj, 'address')).toEqual({
      city: 'Moscow',
      country: 'Russia',
    });
  });

  it('gets whole array', () => {
    expect(getValueByPath(obj, 'tags')).toEqual(['a', 'b', 'c']);
  });

  it('returns undefined for non-existent path', () => {
    expect(getValueByPath(obj, 'nonexistent')).toBeUndefined();
    expect(getValueByPath(obj, 'address.nonexistent')).toBeUndefined();
    expect(getValueByPath(obj, 'users[10]')).toBeUndefined();
    expect(getValueByPath(obj, 'users[0].nonexistent')).toBeUndefined();
  });

  it('returns root for empty path', () => {
    expect(getValueByPath(obj, '')).toBe(obj);
  });

  it('handles null/undefined', () => {
    expect(getValueByPath(null, 'field')).toBeUndefined();
    expect(getValueByPath(undefined, 'field')).toBeUndefined();
  });

  it('handles nested null/undefined', () => {
    const objWithNull = { a: null, b: { c: undefined } };
    expect(getValueByPath(objWithNull, 'a')).toBeNull();
    expect(getValueByPath(objWithNull, 'a.nested')).toBeUndefined();
    expect(getValueByPath(objWithNull, 'b.c')).toBeUndefined();
  });

  it('returns undefined when accessing array index on non-array', () => {
    expect(getValueByPath(obj, 'title[0]')).toBeUndefined();
  });

  it('returns undefined when accessing property on primitive', () => {
    expect(getValueByPath(obj, 'users[0].age.invalid')).toBeUndefined();
  });
});

describe('setValueByPath', () => {
  it('sets simple field', () => {
    const obj: JsonValue = {};
    setValueByPath(obj, 'title', 'New Title');
    expect(obj).toEqual({ title: 'New Title' });
  });

  it('sets nested field', () => {
    const obj: JsonValue = {};
    setValueByPath(obj, 'address.city', 'London');
    expect(obj).toEqual({ address: { city: 'London' } });
  });

  it('sets deeply nested field', () => {
    const obj: JsonValue = {};
    setValueByPath(obj, 'a.b.c.d', 'value');
    expect(obj).toEqual({ a: { b: { c: { d: 'value' } } } });
  });

  it('sets array element in existing array', () => {
    const obj: JsonValue = { tags: ['a', 'b', 'c'] };
    setValueByPath(obj, 'tags[1]', 'modified');
    expect(getValueByPath(obj, 'tags[1]')).toBe('modified');
  });

  it('creates intermediate objects', () => {
    const obj: JsonValue = {};
    setValueByPath(obj, 'a.b.c', 'value');
    expect(obj).toEqual({ a: { b: { c: 'value' } } });
  });

  it('creates intermediate arrays', () => {
    const obj: JsonValue = {};
    setValueByPath(obj, 'arr[0].value', 'test');
    expect(obj).toEqual({ arr: [{ value: 'test' }] });
  });

  it('overwrites existing value', () => {
    const obj: JsonValue = { title: 'Old' };
    setValueByPath(obj, 'title', 'New');
    expect(getValueByPath(obj, 'title')).toBe('New');
  });

  it('sets value in nested array', () => {
    const obj = { users: [{ name: 'John' }] };
    setValueByPath(obj, 'users[0].age', 30);
    expect(obj.users[0]).toEqual({ name: 'John', age: 30 });
  });

  it('creates nested array structure', () => {
    const obj: JsonValue = {};
    setValueByPath(obj, 'matrix[0][0]', 42);
    expect(getValueByPath(obj, 'matrix[0][0]')).toBe(42);
  });

  it('throws for empty path', () => {
    const obj: JsonValue = {};
    expect(() => setValueByPath(obj, '', 'value')).toThrow(
      'Cannot set root value',
    );
  });

  it('throws when setting array index on non-array', () => {
    const obj: JsonValue = { field: 'string' };
    expect(() => setValueByPath(obj, 'field[0]', 'value')).toThrow(
      'Cannot set array index on non-array',
    );
  });

  it('handles setting various types', () => {
    const obj: JsonValue = {};
    setValueByPath(obj, 'string', 'text');
    setValueByPath(obj, 'number', 42);
    setValueByPath(obj, 'boolean', true);
    setValueByPath(obj, 'null', null);
    setValueByPath(obj, 'obj', { nested: 'value' });
    setValueByPath(obj, 'arr', [1, 2, 3]);

    expect(obj).toEqual({
      string: 'text',
      number: 42,
      boolean: true,
      null: null,
      obj: { nested: 'value' },
      arr: [1, 2, 3],
    });
  });

  describe('array index validation', () => {
    it('allows adding element at array.length (append)', () => {
      const obj: JsonValue = { arr: [1, 2] };
      setValueByPath(obj, 'arr[2]', 3);
      expect(getValueByPath(obj, 'arr')).toEqual([1, 2, 3]);
    });

    it('allows updating existing element', () => {
      const obj: JsonValue = { arr: [1, 2, 3] };
      setValueByPath(obj, 'arr[1]', 99);
      expect(getValueByPath(obj, 'arr')).toEqual([1, 99, 3]);
    });

    it('throws when creating sparse array (skipping index)', () => {
      const obj: JsonValue = { arr: [1] };
      expect(() => setValueByPath(obj, 'arr[5]', 'value')).toThrow(
        'Cannot create sparse array: index 5 is out of bounds (array length: 1)',
      );
    });

    it('throws when creating array with non-zero first index', () => {
      const obj: JsonValue = {};
      expect(() => setValueByPath(obj, 'arr[2]', 'value')).toThrow(
        'Cannot create sparse array: index 2 is out of bounds (array length: 0)',
      );
    });

    it('allows sequential array creation', () => {
      const obj: JsonValue = {};
      setValueByPath(obj, 'arr[0]', 'first');
      setValueByPath(obj, 'arr[1]', 'second');
      setValueByPath(obj, 'arr[2]', 'third');
      expect(getValueByPath(obj, 'arr')).toEqual(['first', 'second', 'third']);
    });

    it('throws for sparse nested arrays', () => {
      const obj: JsonValue = {};
      expect(() => setValueByPath(obj, 'matrix[0][2]', 42)).toThrow(
        'Cannot create sparse array: index 2 is out of bounds (array length: 0)',
      );
    });

    it('allows creating nested arrays sequentially', () => {
      const obj: JsonValue = {};
      setValueByPath(obj, 'matrix[0][0]', 1);
      setValueByPath(obj, 'matrix[0][1]', 2);
      expect(getValueByPath(obj, 'matrix[0]')).toEqual([1, 2]);
    });

    it('throws when trying to set array index in intermediate non-array (first segment)', () => {
      const obj: JsonValue = { field: { nested: 'string' } };
      expect(() =>
        setValueByPath(obj, 'field.nested[0].value', 'value'),
      ).toThrow('Cannot set array index on non-array at segment 2');
    });

    it('throws when trying to set array index in final non-array', () => {
      const obj: JsonValue = { field: 'string' };
      expect(() => setValueByPath(obj, 'field[0]', 'value')).toThrow(
        'Cannot set array index on non-array at segment 1',
      );
    });

    it('throws when trying to set property in intermediate array', () => {
      const obj: JsonValue = { arr: [1, 2, 3] };
      expect(() => setValueByPath(obj, 'arr.field.nested', 'value')).toThrow(
        'Cannot set property on non-object at segment 1',
      );
    });

    it('throws when trying to set property on final array', () => {
      const obj: JsonValue = { arr: [1, 2, 3] };
      expect(() => setValueByPath(obj, 'arr.field', 'value')).toThrow(
        'Cannot set property on non-object at segment 1',
      );
    });

    it('throws when intermediate segment creates sparse array', () => {
      const obj: JsonValue = {};
      expect(() => setValueByPath(obj, 'arr[2].field', 'value')).toThrow(
        'Cannot create sparse array: index 2 is out of bounds (array length: 0) at segment 1',
      );
    });
  });
});

describe('hasPath', () => {
  const obj = {
    title: 'Article',
    address: { city: 'Moscow' },
    tags: ['a', 'b'],
    nullValue: null,
  };

  it('returns true for existing simple path', () => {
    expect(hasPath(obj, 'title')).toBe(true);
  });

  it('returns true for existing nested path', () => {
    expect(hasPath(obj, 'address.city')).toBe(true);
  });

  it('returns true for existing array path', () => {
    expect(hasPath(obj, 'tags[0]')).toBe(true);
    expect(hasPath(obj, 'tags[1]')).toBe(true);
  });

  it('returns false for non-existent simple path', () => {
    expect(hasPath(obj, 'nonexistent')).toBe(false);
  });

  it('returns false for non-existent nested path', () => {
    expect(hasPath(obj, 'address.country')).toBe(false);
  });

  it('returns false for out of bounds array index', () => {
    expect(hasPath(obj, 'tags[10]')).toBe(false);
  });

  it('returns false for non-existent nested in array', () => {
    expect(hasPath(obj, 'tags[0].field')).toBe(false);
  });

  it('returns true for null value', () => {
    expect(hasPath(obj, 'nullValue')).toBe(true);
  });

  it('returns false for undefined value', () => {
    const objWithUndefined: JsonValue = { field: undefined };
    expect(hasPath(objWithUndefined, 'field')).toBe(false);
  });

  it('handles empty path', () => {
    expect(hasPath(obj, '')).toBe(true);
  });
});

describe('deepEqual', () => {
  describe('primitives', () => {
    it('compares numbers', () => {
      expect(deepEqual(1, 1)).toBe(true);
      expect(deepEqual(0, 0)).toBe(true);
      expect(deepEqual(-1, -1)).toBe(true);
      expect(deepEqual(1.5, 1.5)).toBe(true);
      expect(deepEqual(1, 2)).toBe(false);
      expect(deepEqual(0, 1)).toBe(false);
    });

    it('compares strings', () => {
      expect(deepEqual('a', 'a')).toBe(true);
      expect(deepEqual('', '')).toBe(true);
      expect(deepEqual('hello', 'hello')).toBe(true);
      expect(deepEqual('a', 'b')).toBe(false);
      expect(deepEqual('hello', 'world')).toBe(false);
    });

    it('compares booleans', () => {
      expect(deepEqual(true, true)).toBe(true);
      expect(deepEqual(false, false)).toBe(true);
      expect(deepEqual(true, false)).toBe(false);
      expect(deepEqual(false, true)).toBe(false);
    });

    it('compares different types', () => {
      expect(deepEqual(1, '1')).toBe(false);
      expect(deepEqual(0, false)).toBe(false);
      expect(deepEqual(1, true)).toBe(false);
      expect(deepEqual('', false)).toBe(false);
    });
  });

  describe('null and undefined', () => {
    it('compares null', () => {
      expect(deepEqual(null, null)).toBe(true);
    });

    it('compares undefined', () => {
      expect(deepEqual(undefined, undefined)).toBe(true);
    });

    it('treats null and undefined as different', () => {
      expect(deepEqual(null, undefined)).toBe(false);
      expect(deepEqual(undefined, null)).toBe(false);
    });

    it('compares null/undefined with other values', () => {
      expect(deepEqual(null, 0)).toBe(false);
      expect(deepEqual(undefined, 0)).toBe(false);
      expect(deepEqual(null, '')).toBe(false);
      expect(deepEqual(null, false)).toBe(false);
    });
  });

  describe('arrays', () => {
    it('compares empty arrays', () => {
      expect(deepEqual([], [])).toBe(true);
    });

    it('compares arrays with primitives', () => {
      expect(deepEqual([1, 2, 3], [1, 2, 3])).toBe(true);
      expect(deepEqual(['a', 'b'], ['a', 'b'])).toBe(true);
      expect(deepEqual([true, false], [true, false])).toBe(true);
    });

    it('detects different array lengths', () => {
      expect(deepEqual([1, 2], [1, 2, 3])).toBe(false);
      expect(deepEqual([1, 2, 3], [1, 2])).toBe(false);
    });

    it('detects different array values', () => {
      expect(deepEqual([1, 2, 3], [1, 2, 4])).toBe(false);
      expect(deepEqual([1, 2, 3], [3, 2, 1])).toBe(false);
    });

    it('compares nested arrays', () => {
      expect(
        deepEqual(
          [
            [1, 2],
            [3, 4],
          ],
          [
            [1, 2],
            [3, 4],
          ],
        ),
      ).toBe(true);
      expect(
        deepEqual(
          [
            [1, 2],
            [3, 4],
          ],
          [
            [1, 2],
            [3, 5],
          ],
        ),
      ).toBe(false);
    });

    it('compares arrays with objects', () => {
      expect(deepEqual([{ a: 1 }, { b: 2 }], [{ a: 1 }, { b: 2 }])).toBe(true);
      expect(deepEqual([{ a: 1 }, { b: 2 }], [{ a: 1 }, { b: 3 }])).toBe(false);
    });

    it('distinguishes arrays from non-arrays', () => {
      expect(deepEqual([1, 2], { 0: 1, 1: 2 })).toBe(false);
      expect(deepEqual([], {})).toBe(false);
    });
  });

  describe('objects', () => {
    it('compares empty objects', () => {
      expect(deepEqual({}, {})).toBe(true);
    });

    it('compares objects with primitive values', () => {
      expect(deepEqual({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true);
      expect(deepEqual({ x: 'hello' }, { x: 'hello' })).toBe(true);
    });

    it('ignores property order', () => {
      expect(deepEqual({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(true);
    });

    it('detects different values', () => {
      expect(deepEqual({ a: 1 }, { a: 2 })).toBe(false);
    });

    it('detects different keys', () => {
      expect(deepEqual({ a: 1 }, { b: 1 })).toBe(false);
      expect(deepEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
      expect(deepEqual({ a: 1, b: 2 }, { a: 1 })).toBe(false);
    });

    it('compares nested objects', () => {
      expect(deepEqual({ a: { b: { c: 1 } } }, { a: { b: { c: 1 } } })).toBe(
        true,
      );
      expect(deepEqual({ a: { b: { c: 1 } } }, { a: { b: { c: 2 } } })).toBe(
        false,
      );
    });

    it('compares objects with arrays', () => {
      expect(deepEqual({ arr: [1, 2, 3] }, { arr: [1, 2, 3] })).toBe(true);
      expect(deepEqual({ arr: [1, 2, 3] }, { arr: [1, 2, 4] })).toBe(false);
    });
  });

  describe('complex nested structures', () => {
    it('compares deeply nested mixed structures', () => {
      const obj1 = {
        a: [1, { b: 2 }],
        c: { d: [3, 4], e: { f: 5 } },
      };
      const obj2 = {
        a: [1, { b: 2 }],
        c: { d: [3, 4], e: { f: 5 } },
      };
      expect(deepEqual(obj1, obj2)).toBe(true);
    });

    it('detects differences in deeply nested structures', () => {
      const obj1 = {
        a: [1, { b: 2 }],
        c: { d: [3, 4], e: { f: 5 } },
      };
      const obj2 = {
        a: [1, { b: 2 }],
        c: { d: [3, 4], e: { f: 6 } },
      };
      expect(deepEqual(obj1, obj2)).toBe(false);
    });

    it('handles arrays of arrays of objects', () => {
      const obj1 = [[{ a: 1 }], [{ b: 2 }]];
      const obj2 = [[{ a: 1 }], [{ b: 2 }]];
      expect(deepEqual(obj1, obj2)).toBe(true);
    });

    it('handles objects with null and undefined values', () => {
      expect(
        deepEqual({ a: null, b: undefined }, { a: null, b: undefined }),
      ).toBe(true);
      expect(deepEqual({ a: null }, { a: undefined })).toBe(false);
      expect(deepEqual({ a: null }, { a: 0 })).toBe(false);
    });

    it('handles arrays with undefined in different positions', () => {
      expect(deepEqual([undefined, 1], [undefined, 1])).toBe(true);
      expect(deepEqual([undefined, 1], [null, 1])).toBe(false);
      expect(deepEqual([1, undefined], [1, 2])).toBe(false);
      expect(deepEqual([undefined], [1])).toBe(false);
    });

    it('handles objects where one property is undefined and other is not', () => {
      expect(deepEqual({ a: undefined }, { a: 1 })).toBe(false);
      expect(deepEqual({ a: 1 }, { a: undefined })).toBe(false);
      expect(deepEqual({ a: undefined, b: 2 }, { a: 1, b: 2 })).toBe(false);
    });

    it('handles arrays with both null and undefined elements', () => {
      expect(deepEqual([null, null], [null, null])).toBe(true);
      expect(deepEqual([undefined, undefined], [undefined, undefined])).toBe(
        true,
      );
      expect(deepEqual([null, undefined], [null, undefined])).toBe(true);
      expect(deepEqual([null, undefined], [undefined, null])).toBe(false);
    });
  });

  describe('same reference', () => {
    it('returns true for same object reference', () => {
      const obj = { a: 1 };
      expect(deepEqual(obj, obj)).toBe(true);
    });

    it('returns true for same array reference', () => {
      const arr = [1, 2, 3];
      expect(deepEqual(arr, arr)).toBe(true);
    });
  });
});
