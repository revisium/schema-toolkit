// MobX provider factory - creates ReactivityProvider from MobX instance
// This file is used by consumers to configure real MobX reactivity

import type { ReactivityProvider } from './provider.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFunction = (...args: any[]) => any;

interface MobXObservable {
  map<K, V>(): Map<K, V>;
  array<T>(): T[];
  ref: unknown;
  shallow: unknown;
}

interface MobXModule {
  makeObservable: AnyFunction;
  makeAutoObservable: AnyFunction;
  isObservable: (target: object) => boolean;
  observable: MobXObservable;
  action: unknown;
  computed: unknown;
  runInAction: <T>(fn: () => T) => T;
  reaction: <T>(
    expression: () => T,
    effect: (value: T) => void,
  ) => () => void;
}

function convertAnnotations(
  mobx: MobXModule,
  annotations: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(annotations)) {
    if (typeof value === 'string') {
      switch (value) {
        case 'observable':
          result[key] = mobx.observable;
          break;
        case 'observable.ref':
          result[key] = mobx.observable.ref;
          break;
        case 'observable.shallow':
          result[key] = mobx.observable.shallow;
          break;
        case 'action':
          result[key] = mobx.action;
          break;
        case 'computed':
          result[key] = mobx.computed;
          break;
        default:
          result[key] = value;
      }
    } else {
      result[key] = value;
    }
  }
  return result;
}

export function createMobxProvider(mobx: MobXModule): ReactivityProvider {
  return {
    makeObservable: <T extends object>(
      target: T,
      annotations: Record<string, unknown>,
    ) => mobx.makeObservable(target, convertAnnotations(mobx, annotations)),
    makeAutoObservable: <T extends object>(
      target: T,
      overrides?: Record<string, unknown>,
    ) => mobx.makeAutoObservable(target, overrides ? convertAnnotations(mobx, overrides) : {}),
    isObservable: mobx.isObservable,
    observable: {
      map: <K, V>() => mobx.observable.map<K, V>(),
      array: <T>() => mobx.observable.array<T>(),
    },
    runInAction: mobx.runInAction,
    reaction: mobx.reaction,
  };
}
