import { describe, it, expect } from '@jest/globals';
import { noopAdapter } from '../noop-adapter';

describe('noopAdapter', () => {
  describe('makeObservable', () => {
    it('does nothing', () => {
      const target = { value: 1 };
      noopAdapter.makeObservable(target, { value: 'observable' });
      expect(target.value).toBe(1);
    });
  });

  describe('observableArray', () => {
    it('returns regular array', () => {
      const arr = noopAdapter.observableArray<number>();
      expect(Array.isArray(arr)).toBe(true);
      expect(arr.length).toBe(0);

      arr.push(1, 2, 3);
      expect(arr).toEqual([1, 2, 3]);
    });
  });

  describe('observableMap', () => {
    it('returns regular Map', () => {
      const map = noopAdapter.observableMap<string, number>();
      expect(map instanceof Map).toBe(true);
      expect(map.size).toBe(0);

      map.set('a', 1);
      expect(map.get('a')).toBe(1);
    });
  });

  describe('reaction', () => {
    it('returns noop dispose function', () => {
      let called = false;
      const dispose = noopAdapter.reaction(
        () => 1,
        () => {
          called = true;
        },
      );

      expect(typeof dispose).toBe('function');
      expect(called).toBe(false);

      dispose();
      expect(called).toBe(false);
    });
  });

  describe('runInAction', () => {
    it('executes function and returns result', () => {
      const result = noopAdapter.runInAction(() => 42);
      expect(result).toBe(42);
    });

    it('executes function with side effects', () => {
      let value = 0;
      noopAdapter.runInAction(() => {
        value = 10;
      });
      expect(value).toBe(10);
    });
  });
});
