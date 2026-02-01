import { describe, it, expect } from '@jest/globals';
import { PropertySegment, ItemsSegment } from '../PathSegment';

describe('PathSegment', () => {
  describe('PropertySegment', () => {
    it('is a property segment', () => {
      const segment = new PropertySegment('name');
      expect(segment.isProperty()).toBe(true);
      expect(segment.isItems()).toBe(false);
    });

    it('returns property name', () => {
      const segment = new PropertySegment('name');
      expect(segment.propertyName()).toBe('name');
    });

    it('equals another property segment with same name', () => {
      const a = new PropertySegment('name');
      const b = new PropertySegment('name');
      expect(a.equals(b)).toBe(true);
    });

    it('does not equal property segment with different name', () => {
      const a = new PropertySegment('name');
      const b = new PropertySegment('other');
      expect(a.equals(b)).toBe(false);
    });

    it('does not equal items segment', () => {
      const property = new PropertySegment('name');
      const items = new ItemsSegment();
      expect(property.equals(items)).toBe(false);
    });
  });

  describe('ItemsSegment', () => {
    it('is an items segment', () => {
      const segment = new ItemsSegment();
      expect(segment.isItems()).toBe(true);
      expect(segment.isProperty()).toBe(false);
    });

    it('throws when accessing property name', () => {
      const segment = new ItemsSegment();
      expect(() => segment.propertyName()).toThrow(
        'Items segment has no property name',
      );
    });

    it('equals another items segment', () => {
      const a = new ItemsSegment();
      const b = new ItemsSegment();
      expect(a.equals(b)).toBe(true);
    });

    it('does not equal property segment', () => {
      const items = new ItemsSegment();
      const property = new PropertySegment('name');
      expect(items.equals(property)).toBe(false);
    });
  });
});
