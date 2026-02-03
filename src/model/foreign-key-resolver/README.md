# ForeignKeyResolver

Manages resolution of foreign key references between tables with support for caching, lazy loading, and automatic prefetching.

## Installation

```typescript
import { createForeignKeyResolver } from 'schema-toolkit/model';
```

## Overview

ForeignKeyResolver provides:
- **Schema caching** - Store and retrieve table schemas
- **Row caching** - Store and retrieve individual rows
- **Lazy loading** - Load data on demand via configurable loader
- **Prefetch** - Automatically load referenced data in the background
- **Loading state** - Track which tables/rows are currently loading
- **Reactivity support** - Integration with MobX or similar

## Usage

### Basic Cache-Only Usage

```typescript
const resolver = createForeignKeyResolver();

// Add schema to cache
resolver.addSchema('categories', categorySchema);

// Add full table with rows
resolver.addTable('products', productSchema, [
  { rowId: 'prod-1', data: { name: 'iPhone', categoryId: 'cat-1' } },
]);

// Check cache
resolver.hasSchema('categories'); // true
resolver.hasRow('products', 'prod-1'); // true

// Get from cache (returns Promise for consistency)
const schema = await resolver.getSchema('categories');
const row = await resolver.getRowData('products', 'prod-1');
```

### With Lazy Loading

```typescript
const resolver = createForeignKeyResolver({
  loader: {
    loadSchema: async (tableId) => api.getTableSchema(tableId),
    loadTable: async (tableId) => api.getTable(tableId),
    loadRow: async (tableId, rowId) => api.getRow(tableId, rowId),
  },
});

// Will load from API if not cached
const schema = await resolver.getSchema('categories');
const row = await resolver.getRowData('categories', 'cat-1');

// Subsequent calls return from cache
const cachedRow = await resolver.getRowData('categories', 'cat-1');
```

### With Automatic Prefetch

```typescript
const resolver = createForeignKeyResolver({
  prefetch: true,
  loader: { ... },
});

// Adding a row with FK will trigger background loading of referenced data
resolver.addTable('products', productSchema, []);
resolver.addRow('products', 'prod-1', { name: 'iPhone', categoryId: 'cat-1' });
// ^ Background: loads categories/cat-1

// Later, data is likely in cache
const categoryRow = await resolver.getRowData('categories', 'cat-1');
```

### Runtime Prefetch Control

```typescript
const resolver = createForeignKeyResolver({ prefetch: false });

// Enable prefetch later
resolver.setPrefetch(true);

// Check current state
resolver.isPrefetchEnabled; // true
```

### Loading State

```typescript
// Check if loading
resolver.isLoading('categories'); // true if schema being loaded
resolver.isLoadingRow('categories', 'cat-1'); // true if row being loaded
```

### With Reactivity (MobX)

```typescript
import { mobxAdapter } from 'your-mobx-adapter';

const resolver = createForeignKeyResolver({
  reactivity: mobxAdapter,
  loader: { ... },
});

// Observable properties:
// - isPrefetchEnabled
// - Cache maps for UI reactivity
```

## API

### Factory

```typescript
function createForeignKeyResolver(options?: ForeignKeyResolverOptions): ForeignKeyResolver
```

### ForeignKeyResolverOptions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `loader` | `ForeignKeyLoader` | - | Async loader for fetching data |
| `prefetch` | `boolean` | `false` | Enable automatic FK prefetching |
| `prefetchDepth` | `1` | `1` | How deep to prefetch (currently only 1) |
| `reactivity` | `ReactivityAdapter` | - | MobX adapter for observability |

### ForeignKeyLoader Interface

```typescript
interface ForeignKeyLoader {
  loadSchema(tableId: string): Promise<JsonObjectSchema>;
  loadTable(tableId: string): Promise<ForeignKeyLoaderResult>;
  loadRow(tableId: string, rowId: string): Promise<ForeignKeyRowLoaderResult>;
}
```

### ForeignKeyResolver Interface

```typescript
interface ForeignKeyResolver {
  // Cache management
  addSchema(tableId: string, schema: JsonObjectSchema): void;
  addTable(tableId: string, schema: JsonObjectSchema, rows: RowData[]): void;
  addRow(tableId: string, rowId: string, data: unknown): void;

  // Data retrieval (async, uses cache or loader)
  getSchema(tableId: string): Promise<JsonObjectSchema>;
  getRowData(tableId: string, rowId: string): Promise<RowData>;

  // Loading state
  isLoading(tableId: string): boolean;
  isLoadingRow(tableId: string, rowId: string): boolean;

  // Cache checks (sync)
  hasSchema(tableId: string): boolean;
  hasTable(tableId: string): boolean;
  hasRow(tableId: string, rowId: string): boolean;

  // Prefetch control
  setPrefetch(enabled: boolean): void;
  readonly isPrefetchEnabled: boolean;

  // Cleanup
  dispose(): void;
}
```

## Error Handling

### ForeignKeyNotFoundError

Thrown when data is not cached and no loader is configured:

```typescript
try {
  await resolver.getSchema('unknown');
} catch (error) {
  if (error instanceof ForeignKeyNotFoundError) {
    console.log(error.tableId); // 'unknown'
    console.log(error.rowId);   // undefined for schema errors
  }
}
```

### ForeignKeyResolverNotConfiguredError

Thrown when attempting to load data without a configured loader:

```typescript
const resolver = createForeignKeyResolver(); // no loader
await resolver.getSchema('users'); // throws ForeignKeyNotFoundError (no cached data, no loader)
```

Note: When no loader is configured and data is not in cache, `ForeignKeyNotFoundError` is thrown. `ForeignKeyResolverNotConfiguredError` is thrown internally when loader methods are called without a loader.

## Prefetch Behavior

When prefetch is enabled:

1. **On addRow**: Scans the row's data for FK fields, triggers background loading
2. **On addTable**: Scans all rows for FK fields, triggers background loading
3. **Depth limit**: Only first-level FKs are loaded (no recursive prefetch)
4. **Error handling**: Prefetch errors are silently ignored
5. **Non-blocking**: addRow/addTable return immediately, loading happens in background

## Flow Diagrams

### getSchema Flow

```text
getSchema('categories')
    │
    ├─→ hasSchema? → return cached
    │
    ├─→ hasTable? → return table.schema
    │
    └─→ loader.loadSchema('categories')
            │
            ├─→ addSchema (cache)
            │
            └─→ return schema
```

### getRowData Flow

```text
getRowData('categories', 'cat-1')
    │
    ├─→ hasRow? → return cached
    │
    └─→ loader.loadRow('categories', 'cat-1')
            │
            ├─→ addSchema (from response)
            ├─→ ensureTableCache
            ├─→ addRow (cache)
            │
            └─→ return row
```

### Prefetch Flow

```text
prefetch: true

addRow('products', 'prod-1', { categoryId: 'cat-1' })
    │
    ├─→ scan FK fields in schema
    │       categoryId → foreignKey: 'categories'
    │
    └─→ background: getRowData('categories', 'cat-1')
            └─→ loads, does NOT recursively prefetch
```
