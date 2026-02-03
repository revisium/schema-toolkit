import { describe, it, expect } from '@jest/globals';
import {
  jsonPointerToPath,
  jsonPointerToSegments,
  jsonPointerToSimplePath,
} from '../PathParser';

describe('PathParser', () => {
  describe('jsonPointerToSegments', () => {
    it('returns empty array for empty string', () => {
      expect(jsonPointerToSegments('')).toEqual([]);
    });

    it('returns empty array for root slash', () => {
      expect(jsonPointerToSegments('/')).toEqual([]);
    });

    it('parses single property', () => {
      const segments = jsonPointerToSegments('/properties/name');
      expect(segments.length).toBe(1);
      expect(segments[0]?.isProperty()).toBe(true);
      expect(segments[0]?.propertyName()).toBe('name');
    });

    it('parses nested properties', () => {
      const segments = jsonPointerToSegments(
        '/properties/user/properties/name',
      );
      expect(segments.length).toBe(2);
      expect(segments[0]?.propertyName()).toBe('user');
      expect(segments[1]?.propertyName()).toBe('name');
    });

    it('parses items segment', () => {
      const segments = jsonPointerToSegments('/items');
      expect(segments.length).toBe(1);
      expect(segments[0]?.isItems()).toBe(true);
    });

    it('parses property with items', () => {
      const segments = jsonPointerToSegments(
        '/properties/arr/items/properties/value',
      );
      expect(segments.length).toBe(3);
      expect(segments[0]?.propertyName()).toBe('arr');
      expect(segments[1]?.isItems()).toBe(true);
      expect(segments[2]?.propertyName()).toBe('value');
    });

    it('throws for invalid segment', () => {
      expect(() => jsonPointerToSegments('/unknown/field')).toThrow(
        'Invalid path segment: unknown',
      );
    });

    it('returns empty array for properties without name', () => {
      const segments = jsonPointerToSegments('/properties');
      expect(segments).toEqual([]);
    });

    it('returns single segment with empty name for /properties/', () => {
      const segments = jsonPointerToSegments('/properties/');
      expect(segments.length).toBe(1);
      expect(segments[0]?.isProperty()).toBe(true);
      expect(segments[0]?.propertyName()).toBe('');
    });

    it('handles path with empty name followed by another property', () => {
      const segments = jsonPointerToSegments('/properties//properties/name');
      expect(segments.length).toBe(2);
      expect(segments[0]?.propertyName()).toBe('');
      expect(segments[1]?.propertyName()).toBe('name');
    });
  });

  describe('jsonPointerToPath', () => {
    it('returns empty path for empty string', () => {
      const path = jsonPointerToPath('');
      expect(path.isEmpty()).toBe(true);
    });

    it('returns path with property', () => {
      const path = jsonPointerToPath('/properties/name');
      expect(path.length()).toBe(1);
      expect(path.asSimple()).toBe('name');
    });

    it('returns path with nested properties', () => {
      const path = jsonPointerToPath('/properties/user/properties/name');
      expect(path.length()).toBe(2);
      expect(path.asSimple()).toBe('user.name');
    });

    it('returns path with items', () => {
      const path = jsonPointerToPath('/properties/arr/items/properties/value');
      expect(path.asSimple()).toBe('arr[*].value');
    });
  });

  describe('jsonPointerToSimplePath', () => {
    it('converts to simple path', () => {
      expect(jsonPointerToSimplePath('/properties/name')).toBe('name');
      expect(jsonPointerToSimplePath('/properties/user/properties/name')).toBe(
        'user.name',
      );
      expect(
        jsonPointerToSimplePath('/properties/arr/items/properties/value'),
      ).toBe('arr[*].value');
    });
  });
});
