# Reactivity Module

Adapter pattern for optional MobX reactivity. Allows models to work both in backend (no reactivity) and UI (with MobX).

## API

```typescript
interface ReactivityAdapter {
  makeObservable<T>(target: T, annotations: AnnotationsMap<T>): void;
  observableArray<T>(): T[];
  observableMap<K, V>(): Map<K, V>;
  reaction<T>(expr: () => T, effect: (v: T) => void): () => void;
  runInAction<T>(fn: () => T): T;
}

// No-op implementation for backend/testing
const noopAdapter: ReactivityAdapter;
```

## Usage

**Backend (no reactivity):**
```typescript
import { noopAdapter } from '@revisium/schema-toolkit/core';

const model = createValueModel(schema, data, {
  reactivity: noopAdapter,
});
```

**UI (with MobX):**
```typescript
import { mobxAdapter } from '@revisium/schema-toolkit-ui';

const model = createValueModel(schema, data, {
  reactivity: mobxAdapter,
});
```

## noopAdapter Behavior

| Method | Behavior |
|--------|----------|
| `makeObservable()` | No-op |
| `observableArray()` | Returns `[]` |
| `observableMap()` | Returns `new Map()` |
| `reaction()` | Returns no-op dispose |
| `runInAction(fn)` | Calls `fn()` directly |
