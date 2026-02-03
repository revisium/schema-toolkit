// MobX-compatible API that delegates to the current provider

import { getReactivityProvider } from './provider.js';

export function makeObservable<T extends object>(
  target: T,
  annotations: Record<string, unknown>,
): T {
  return getReactivityProvider().makeObservable(target, annotations);
}

export function makeAutoObservable<T extends object>(
  target: T,
  overrides?: Record<string, unknown>,
): T {
  return getReactivityProvider().makeAutoObservable(target, overrides ?? {});
}

export function isObservable(target: object): boolean {
  return getReactivityProvider().isObservable(target);
}

export const observable = {
  map<K, V>(): Map<K, V> {
    return getReactivityProvider().observable.map<K, V>();
  },
  array<T>(): T[] {
    return getReactivityProvider().observable.array<T>();
  },
};

export function runInAction<T>(fn: () => T): T {
  return getReactivityProvider().runInAction(fn);
}

export function reaction<T>(
  expression: () => T,
  effect: (value: T) => void,
): () => void {
  return getReactivityProvider().reaction(expression, effect);
}
