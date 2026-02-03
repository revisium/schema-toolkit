import { describe, it, expect } from '@jest/globals';
import { parseValuePath, stringToValuePath } from '../ValuePathParser.js';

describe('ValuePathParser', () => {
  describe('parseValuePath', () => {
    it('returns empty array for empty string', () => {
      expect(parseValuePath('')).toEqual([]);
    });

    it('parses single property', () => {
      const segments = parseValuePath('name');
      expect(segments).toHaveLength(1);
      expect(segments[0]?.isProperty()).toBe(true);
      expect(segments[0]?.propertyName()).toBe('name');
    });

    it('parses dot-separated properties', () => {
      const segments = parseValuePath('address.city');
      expect(segments).toHaveLength(2);
      expect(segments[0]?.propertyName()).toBe('address');
      expect(segments[1]?.propertyName()).toBe('city');
    });

    it('parses deeply nested properties', () => {
      const segments = parseValuePath('a.b.c.d');
      expect(segments).toHaveLength(4);
      expect(segments[0]?.propertyName()).toBe('a');
      expect(segments[1]?.propertyName()).toBe('b');
      expect(segments[2]?.propertyName()).toBe('c');
      expect(segments[3]?.propertyName()).toBe('d');
    });

    it('parses array index', () => {
      const segments = parseValuePath('items[0]');
      expect(segments).toHaveLength(2);
      expect(segments[0]?.propertyName()).toBe('items');
      expect(segments[1]?.isIndex()).toBe(true);
      expect(segments[1]?.indexValue()).toBe(0);
    });

    it('parses array index with larger number', () => {
      const segments = parseValuePath('items[42]');
      expect(segments).toHaveLength(2);
      expect(segments[1]?.indexValue()).toBe(42);
    });

    it('parses property after array index', () => {
      const segments = parseValuePath('items[0].name');
      expect(segments).toHaveLength(3);
      expect(segments[0]?.propertyName()).toBe('items');
      expect(segments[1]?.indexValue()).toBe(0);
      expect(segments[2]?.propertyName()).toBe('name');
    });

    it('parses nested arrays', () => {
      const segments = parseValuePath('matrix[0][1]');
      expect(segments).toHaveLength(3);
      expect(segments[0]?.propertyName()).toBe('matrix');
      expect(segments[1]?.indexValue()).toBe(0);
      expect(segments[2]?.indexValue()).toBe(1);
    });

    it('parses complex path', () => {
      const segments = parseValuePath('users[0].addresses[1].city');
      expect(segments).toHaveLength(5);
      expect(segments[0]?.propertyName()).toBe('users');
      expect(segments[1]?.indexValue()).toBe(0);
      expect(segments[2]?.propertyName()).toBe('addresses');
      expect(segments[3]?.indexValue()).toBe(1);
      expect(segments[4]?.propertyName()).toBe('city');
    });

    it('handles leading dot gracefully', () => {
      const segments = parseValuePath('.name');
      expect(segments).toHaveLength(1);
      expect(segments[0]?.propertyName()).toBe('name');
    });

    it('handles consecutive dots gracefully', () => {
      const segments = parseValuePath('a..b');
      expect(segments).toHaveLength(2);
      expect(segments[0]?.propertyName()).toBe('a');
      expect(segments[1]?.propertyName()).toBe('b');
    });

    it('parses standalone index', () => {
      const segments = parseValuePath('[0]');
      expect(segments).toHaveLength(1);
      expect(segments[0]?.isIndex()).toBe(true);
      expect(segments[0]?.indexValue()).toBe(0);
    });

    it('throws for missing closing bracket', () => {
      expect(() => parseValuePath('items[0')).toThrow(
        'Invalid path: missing closing bracket in "items[0"',
      );
    });

    it('throws for empty index', () => {
      expect(() => parseValuePath('items[]')).toThrow(
        'Invalid path: index must be a non-negative integer, got "" in "items[]"',
      );
    });

    it('throws for non-numeric index', () => {
      expect(() => parseValuePath('items[abc]')).toThrow(
        'Invalid path: index must be a non-negative integer, got "abc" in "items[abc]"',
      );
    });

    it('throws for negative index', () => {
      expect(() => parseValuePath('items[-1]')).toThrow(
        'Invalid path: index must be a non-negative integer, got "-1" in "items[-1]"',
      );
    });

    it('throws for floating point index', () => {
      expect(() => parseValuePath('items[1.5]')).toThrow(
        'Invalid path: index must be a non-negative integer, got "1.5" in "items[1.5]"',
      );
    });
  });

  describe('stringToValuePath', () => {
    it('creates ValuePath from string', () => {
      const path = stringToValuePath('address.city');
      expect(path.asString()).toBe('address.city');
    });

    it('creates empty path from empty string', () => {
      const path = stringToValuePath('');
      expect(path.isEmpty()).toBe(true);
    });

    it('roundtrips complex path', () => {
      const original = 'users[0].addresses[1].city';
      const path = stringToValuePath(original);
      expect(path.asString()).toBe(original);
    });
  });
});
