import type { AnnotationsMap } from '../types/index.js';

export interface ReactivityAdapter {
  makeObservable<T extends object>(
    target: T,
    annotations: AnnotationsMap<T>,
  ): void;

  observableArray<T>(): T[];

  observableMap<K, V>(): Map<K, V>;

  reaction<T>(
    expression: () => T,
    effect: (value: T) => void,
  ): () => void;

  runInAction<T>(fn: () => T): T;
}
