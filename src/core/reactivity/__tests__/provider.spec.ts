import { describe, it, expect, beforeEach } from '@jest/globals';
import * as mobx from 'mobx';
import {
  makeObservable,
  makeAutoObservable,
  observable,
  runInAction,
  reaction,
  setReactivityProvider,
  resetReactivityProvider,
  createMobxProvider,
} from '../index.js';

describe('reactivity provider', () => {
  describe('noop provider (default)', () => {
    beforeEach(() => {
      resetReactivityProvider();
    });

    afterAll(() => {
      setReactivityProvider(createMobxProvider(mobx));
    });

    it('makeObservable returns target unchanged', () => {
      const target = { value: 1 };
      const result = makeObservable(target, { value: 'observable' });

      expect(result).toBe(target);
    });

    it('makeAutoObservable returns target unchanged', () => {
      const target = { value: 1 };
      const result = makeAutoObservable(target);

      expect(result).toBe(target);
    });

    it('observable.map returns plain Map', () => {
      const map = observable.map<string, number>();

      expect(map).toBeInstanceOf(Map);
      map.set('a', 1);
      expect(map.get('a')).toBe(1);
    });

    it('observable.array returns plain array', () => {
      const arr = observable.array<number>();

      expect(Array.isArray(arr)).toBe(true);
      arr.push(1);
      expect(arr[0]).toBe(1);
    });

    it('runInAction executes function directly', () => {
      let called = false;
      const result = runInAction(() => {
        called = true;
        return 42;
      });

      expect(called).toBe(true);
      expect(result).toBe(42);
    });

    it('reaction returns noop dispose', () => {
      let called = false;
      const dispose = reaction(
        () => 1,
        () => {
          called = true;
        },
      );

      expect(typeof dispose).toBe('function');
      expect(called).toBe(false);
      dispose();
    });
  });

  describe('mobx provider', () => {
    beforeEach(() => {
      setReactivityProvider(createMobxProvider(mobx));
    });

    it('makeObservable makes object observable', () => {
      class TestClass {
        value = 1;
        constructor() {
          makeObservable(this, { value: 'observable' });
        }
      }

      const instance = new TestClass();

      expect(mobx.isObservable(instance)).toBe(true);
    });

    it('observable.map returns MobX observable map', () => {
      const map = observable.map<string, number>();

      expect(mobx.isObservableMap(map)).toBe(true);
    });

    it('observable.array returns MobX observable array', () => {
      const arr = observable.array<number>();

      expect(mobx.isObservableArray(arr)).toBe(true);
    });

    it('runInAction batches updates', () => {
      class Store {
        value = 0;
        constructor() {
          makeObservable(this, { value: 'observable' });
        }
      }

      const store = new Store();
      let reactionCount = 0;

      mobx.autorun(() => {
        void store.value;
        reactionCount++;
      });

      runInAction(() => {
        store.value = 1;
        store.value = 2;
        store.value = 3;
      });

      expect(store.value).toBe(3);
      expect(reactionCount).toBe(2);
    });

    it('reaction sets up MobX reaction', () => {
      class Store {
        value = 0;
        constructor() {
          makeObservable(this, { value: 'observable' });
        }
      }

      const store = new Store();
      const values: number[] = [];

      const dispose = reaction(
        () => store.value,
        (value) => values.push(value),
      );

      store.value = 1;
      store.value = 2;

      dispose();
      store.value = 3;

      expect(values).toEqual([1, 2]);
    });
  });

  describe('resetReactivityProvider', () => {
    it('resets to noop provider', () => {
      setReactivityProvider(createMobxProvider(mobx));
      resetReactivityProvider();

      const map = observable.map<string, number>();

      expect(mobx.isObservableMap(map)).toBe(false);

      setReactivityProvider(createMobxProvider(mobx));
    });
  });
});
