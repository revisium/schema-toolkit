import { describe, it, expect } from '@jest/globals';
import { EMPTY_VALUE_PATH, createValuePath } from '../ValuePath.js';
import { PropertySegment, IndexSegment } from '../ValuePathSegment.js';

describe('ValuePath', () => {
  describe('EMPTY_VALUE_PATH', () => {
    it('isEmpty returns true', () => {
      expect(EMPTY_VALUE_PATH.isEmpty()).toBe(true);
    });

    it('length returns 0', () => {
      expect(EMPTY_VALUE_PATH.length()).toBe(0);
    });

    it('segments returns empty array', () => {
      expect(EMPTY_VALUE_PATH.segments()).toEqual([]);
    });

    it('asString returns empty string', () => {
      expect(EMPTY_VALUE_PATH.asString()).toBe('');
    });

    it('parent returns empty path', () => {
      expect(EMPTY_VALUE_PATH.parent()).toBe(EMPTY_VALUE_PATH);
    });
  });

  describe('createValuePath', () => {
    it('returns EMPTY_VALUE_PATH for empty segments', () => {
      expect(createValuePath([])).toBe(EMPTY_VALUE_PATH);
    });

    it('creates path from segments', () => {
      const path = createValuePath([new PropertySegment('name')]);
      expect(path.length()).toBe(1);
    });
  });

  describe('asString', () => {
    it('returns property name for single property', () => {
      const path = createValuePath([new PropertySegment('name')]);
      expect(path.asString()).toBe('name');
    });

    it('returns dot-separated for nested properties', () => {
      const path = createValuePath([
        new PropertySegment('address'),
        new PropertySegment('city'),
      ]);
      expect(path.asString()).toBe('address.city');
    });

    it('returns bracket notation for index', () => {
      const path = createValuePath([
        new PropertySegment('items'),
        new IndexSegment(0),
      ]);
      expect(path.asString()).toBe('items[0]');
    });

    it('returns complex path correctly', () => {
      const path = createValuePath([
        new PropertySegment('users'),
        new IndexSegment(0),
        new PropertySegment('addresses'),
        new IndexSegment(1),
        new PropertySegment('city'),
      ]);
      expect(path.asString()).toBe('users[0].addresses[1].city');
    });

    it('handles standalone index', () => {
      const path = createValuePath([new IndexSegment(0)]);
      expect(path.asString()).toBe('[0]');
    });

    it('handles nested indices', () => {
      const path = createValuePath([
        new PropertySegment('matrix'),
        new IndexSegment(0),
        new IndexSegment(1),
      ]);
      expect(path.asString()).toBe('matrix[0][1]');
    });
  });

  describe('asJsonPointer', () => {
    it('returns empty string for empty path', () => {
      expect(EMPTY_VALUE_PATH.asJsonPointer()).toBe('');
    });

    it('returns /name for single property', () => {
      const path = createValuePath([new PropertySegment('name')]);
      expect(path.asJsonPointer()).toBe('/name');
    });

    it('returns slash-separated for nested properties', () => {
      const path = createValuePath([
        new PropertySegment('address'),
        new PropertySegment('city'),
      ]);
      expect(path.asJsonPointer()).toBe('/address/city');
    });

    it('returns numeric index for array access', () => {
      const path = createValuePath([
        new PropertySegment('items'),
        new IndexSegment(0),
      ]);
      expect(path.asJsonPointer()).toBe('/items/0');
    });

    it('returns complex path correctly', () => {
      const path = createValuePath([
        new PropertySegment('users'),
        new IndexSegment(0),
        new PropertySegment('addresses'),
        new IndexSegment(1),
        new PropertySegment('city'),
      ]);
      expect(path.asJsonPointer()).toBe('/users/0/addresses/1/city');
    });

    it('handles standalone index', () => {
      const path = createValuePath([new IndexSegment(0)]);
      expect(path.asJsonPointer()).toBe('/0');
    });

    it('handles nested indices', () => {
      const path = createValuePath([
        new PropertySegment('matrix'),
        new IndexSegment(0),
        new IndexSegment(1),
      ]);
      expect(path.asJsonPointer()).toBe('/matrix/0/1');
    });
  });

  describe('parent', () => {
    it('returns empty path for single segment', () => {
      const path = createValuePath([new PropertySegment('name')]);
      expect(path.parent().isEmpty()).toBe(true);
    });

    it('returns parent path for nested path', () => {
      const path = createValuePath([
        new PropertySegment('address'),
        new PropertySegment('city'),
      ]);
      expect(path.parent().asString()).toBe('address');
    });

    it('returns parent path for array access', () => {
      const path = createValuePath([
        new PropertySegment('items'),
        new IndexSegment(0),
      ]);
      expect(path.parent().asString()).toBe('items');
    });
  });

  describe('child', () => {
    it('creates child from empty path', () => {
      const child = EMPTY_VALUE_PATH.child('name');
      expect(child.asString()).toBe('name');
    });

    it('creates nested child', () => {
      const path = createValuePath([new PropertySegment('address')]);
      const child = path.child('city');
      expect(child.asString()).toBe('address.city');
    });
  });

  describe('childIndex', () => {
    it('creates indexed child', () => {
      const path = createValuePath([new PropertySegment('items')]);
      const child = path.childIndex(0);
      expect(child.asString()).toBe('items[0]');
    });

    it('creates indexed child from empty path', () => {
      const child = EMPTY_VALUE_PATH.childIndex(0);
      expect(child.asString()).toBe('[0]');
    });
  });

  describe('equals', () => {
    it('returns true for equal paths', () => {
      const a = createValuePath([
        new PropertySegment('address'),
        new PropertySegment('city'),
      ]);
      const b = createValuePath([
        new PropertySegment('address'),
        new PropertySegment('city'),
      ]);
      expect(a.equals(b)).toBe(true);
    });

    it('returns false for different lengths', () => {
      const a = createValuePath([new PropertySegment('address')]);
      const b = createValuePath([
        new PropertySegment('address'),
        new PropertySegment('city'),
      ]);
      expect(a.equals(b)).toBe(false);
    });

    it('returns false for different segments', () => {
      const a = createValuePath([new PropertySegment('name')]);
      const b = createValuePath([new PropertySegment('age')]);
      expect(a.equals(b)).toBe(false);
    });

    it('empty paths are equal', () => {
      expect(EMPTY_VALUE_PATH.equals(createValuePath([]))).toBe(true);
    });
  });

  describe('isChildOf', () => {
    it('returns true when path is child of parent', () => {
      const parent = createValuePath([new PropertySegment('address')]);
      const child = createValuePath([
        new PropertySegment('address'),
        new PropertySegment('city'),
      ]);
      expect(child.isChildOf(parent)).toBe(true);
    });

    it('returns false when path is not child', () => {
      const a = createValuePath([new PropertySegment('name')]);
      const b = createValuePath([new PropertySegment('age')]);
      expect(a.isChildOf(b)).toBe(false);
    });

    it('returns false when path equals parent', () => {
      const path = createValuePath([new PropertySegment('address')]);
      expect(path.isChildOf(path)).toBe(false);
    });

    it('returns false when path is shorter than parent', () => {
      const parent = createValuePath([
        new PropertySegment('address'),
        new PropertySegment('city'),
      ]);
      const child = createValuePath([new PropertySegment('address')]);
      expect(child.isChildOf(parent)).toBe(false);
    });

    it('returns true for deeply nested child', () => {
      const parent = createValuePath([new PropertySegment('a')]);
      const child = createValuePath([
        new PropertySegment('a'),
        new PropertySegment('b'),
        new PropertySegment('c'),
      ]);
      expect(child.isChildOf(parent)).toBe(true);
    });
  });
});
