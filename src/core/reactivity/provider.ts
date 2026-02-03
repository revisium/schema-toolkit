// Reactivity provider - allows switching between MobX and noop implementations

export interface ObservableFactory {
  map<K, V>(): Map<K, V>;
  array<T>(): T[];
}

export interface ReactivityProvider {
  makeObservable<T extends object>(
    target: T,
    annotations: Record<string, unknown>,
  ): T;
  makeAutoObservable<T extends object>(
    target: T,
    overrides?: Record<string, unknown>,
  ): T;
  isObservable(target: object): boolean;
  observable: ObservableFactory;
  runInAction<T>(fn: () => T): T;
  reaction<T>(
    expression: () => T,
    effect: (value: T) => void,
  ): () => void;
}

// Noop implementation - default for backend
const noopProvider: ReactivityProvider = {
  makeObservable: <T extends object>(target: T) => target,
  makeAutoObservable: <T extends object>(target: T) => target,
  isObservable: () => false,
  observable: {
    map: <K, V>() => new Map<K, V>(),
    array: <T>() => [] as T[],
  },
  runInAction: <T>(fn: () => T) => fn(),
  reaction: () => () => {},
};

let currentProvider: ReactivityProvider = noopProvider;

export function setReactivityProvider(provider: ReactivityProvider): void {
  currentProvider = provider;
}

export function getReactivityProvider(): ReactivityProvider {
  return currentProvider;
}

export function resetReactivityProvider(): void {
  currentProvider = noopProvider;
}
