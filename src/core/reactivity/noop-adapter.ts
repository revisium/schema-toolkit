import type { AnnotationsMap } from '../types/index.js';
import type { ReactivityAdapter } from './types.js';

class NoopReactivityAdapter implements ReactivityAdapter {
  makeObservable<T extends object>(
    _target: T,
    _annotations: AnnotationsMap<T>,
  ): void {
    // noop
  }

  observableArray<T>(): T[] {
    return [];
  }

  observableMap<K, V>(): Map<K, V> {
    return new Map();
  }

  reaction<T>(
    _expression: () => T,
    _effect: (value: T) => void,
  ): () => void {
    return () => {};
  }

  runInAction<T>(fn: () => T): T {
    return fn();
  }
}

export const noopAdapter: ReactivityAdapter = new NoopReactivityAdapter();
