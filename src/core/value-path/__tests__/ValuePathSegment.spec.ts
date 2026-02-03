import { describe, it, expect } from '@jest/globals';
import { PropertySegment, IndexSegment } from '../ValuePathSegment.js';

describe('ValuePathSegment', () => {
  describe('PropertySegment', () => {
    it('isProperty returns true', () => {
      const segment = new PropertySegment('name');
      expect(segment.isProperty()).toBe(true);
    });

    it('isIndex returns false', () => {
      const segment = new PropertySegment('name');
      expect(segment.isIndex()).toBe(false);
    });

    it('propertyName returns the name', () => {
      const segment = new PropertySegment('name');
      expect(segment.propertyName()).toBe('name');
    });

    it('indexValue throws error', () => {
      const segment = new PropertySegment('name');
      expect(() => segment.indexValue()).toThrow('Property segment has no index value');
    });

    it('equals returns true for same property', () => {
      const a = new PropertySegment('name');
      const b = new PropertySegment('name');
      expect(a.equals(b)).toBe(true);
    });

    it('equals returns false for different property', () => {
      const a = new PropertySegment('name');
      const b = new PropertySegment('age');
      expect(a.equals(b)).toBe(false);
    });

    it('equals returns false for index segment', () => {
      const a = new PropertySegment('name');
      const b = new IndexSegment(0);
      expect(a.equals(b)).toBe(false);
    });
  });

  describe('IndexSegment', () => {
    it('isProperty returns false', () => {
      const segment = new IndexSegment(0);
      expect(segment.isProperty()).toBe(false);
    });

    it('isIndex returns true', () => {
      const segment = new IndexSegment(0);
      expect(segment.isIndex()).toBe(true);
    });

    it('indexValue returns the index', () => {
      const segment = new IndexSegment(42);
      expect(segment.indexValue()).toBe(42);
    });

    it('propertyName throws error', () => {
      const segment = new IndexSegment(0);
      expect(() => segment.propertyName()).toThrow('Index segment has no property name');
    });

    it('equals returns true for same index', () => {
      const a = new IndexSegment(5);
      const b = new IndexSegment(5);
      expect(a.equals(b)).toBe(true);
    });

    it('equals returns false for different index', () => {
      const a = new IndexSegment(5);
      const b = new IndexSegment(10);
      expect(a.equals(b)).toBe(false);
    });

    it('equals returns false for property segment', () => {
      const a = new IndexSegment(0);
      const b = new PropertySegment('name');
      expect(a.equals(b)).toBe(false);
    });
  });
});
