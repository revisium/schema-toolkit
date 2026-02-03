# Reactivity Module

Provider pattern for MobX reactivity. Uses noop implementation by default for backend/testing, configurable to use real MobX for UI.

## API

```typescript
// MobX-compatible functions (auto-delegated to current provider)
import {
  makeObservable,
  makeAutoObservable,
  observable,
  runInAction,
  reaction,
} from '@revisium/schema-toolkit/core';

// Provider management
import {
  setReactivityProvider,
  resetReactivityProvider,
  createMobxProvider,
} from '@revisium/schema-toolkit/core';
```

## Usage

**Backend (default - no reactivity):**
```typescript
import { createSchemaModel } from '@revisium/schema-toolkit';

// Works out of the box - uses noop provider by default
const model = createSchemaModel(schema);
```

**UI (with MobX):**
```typescript
import * as mobx from 'mobx';
import { setReactivityProvider, createMobxProvider } from '@revisium/schema-toolkit/core';
import { createSchemaModel } from '@revisium/schema-toolkit';

// Configure MobX as provider (typically in app initialization)
setReactivityProvider(createMobxProvider(mobx));

// Now all models are reactive
const model = createSchemaModel(schema);
```

**Tests (with MobX):**
```typescript
// jest.config.js or vitest setup
// Add to setupFilesAfterEnv

import * as mobx from 'mobx';
import { setReactivityProvider, createMobxProvider } from '@revisium/schema-toolkit/core';

mobx.configure({ enforceActions: 'never' });
setReactivityProvider(createMobxProvider(mobx));
```

## Default (Noop) Behavior

When no provider is configured, the noop provider is used:

| Function | Behavior |
|----------|----------|
| `makeObservable()` | Returns target unchanged |
| `makeAutoObservable()` | Returns target unchanged |
| `observable.array()` | Returns `[]` |
| `observable.map()` | Returns `new Map()` |
| `reaction()` | Returns no-op dispose |
| `runInAction(fn)` | Calls `fn()` directly |

## Architecture

The module uses a provider pattern:

1. **provider.ts** - Defines `ReactivityProvider` interface and noop implementation
2. **api.ts** - MobX-compatible functions that delegate to current provider
3. **mobx-provider.ts** - Factory to create provider from real MobX instance
