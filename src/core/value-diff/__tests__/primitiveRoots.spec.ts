import { describe, it, expect } from '@jest/globals';
import { computeValueDiff } from '../computeValueDiff.js';
import { FieldChangeType } from '../types.js';

describe('computeValueDiff - primitive root types', () => {
  describe('string root', () => {
    it('detects string modification', () => {
      const result = computeValueDiff('v2.2.0', 'v2.5.1');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        path: '',
        oldValue: 'v2.2.0',
        newValue: 'v2.5.1',
        changeType: FieldChangeType.Modified,
      });
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
  });

  describe('number root', () => {
    it('detects number modification', () => {
      const result = computeValueDiff(42, 100);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        path: '',
        oldValue: 42,
        newValue: 100,
        changeType: FieldChangeType.Modified,
      });
    });
  });

  describe('boolean root', () => {
    it('detects boolean modification', () => {
      const result = computeValueDiff(true, false);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        path: '',
        oldValue: true,
        newValue: false,
        changeType: FieldChangeType.Modified,
      });
    });
  });

  describe('array root', () => {
    it('handles root array element addition', () => {
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

    it('handles null to root array', () => {
      const result = computeValueDiff(null, [1, 2, 3]);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        path: '',
        oldValue: null,
        newValue: [1, 2, 3],
        changeType: FieldChangeType.Added,
      });
    });

    it('handles root array to null', () => {
      const result = computeValueDiff([1, 2, 3], null);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        path: '',
        oldValue: [1, 2, 3],
        newValue: null,
        changeType: FieldChangeType.Removed,
      });
    });
  });
});
