# DataModel

A container for managing multiple tables with integrated foreign key resolution.

## Installation

```typescript
import { createDataModel } from 'schema-toolkit/model';
```

## Overview

DataModel provides:
- **Table management** - Add, get, remove tables
- **FK integration** - Automatic schema/row caching in ForeignKeyResolver
- **Dirty tracking** - Track changes across all tables
- **Commit/revert** - Batch save/discard changes

## Usage

### Basic Usage

```typescript
const dataModel = createDataModel();

// Add tables
const usersTable = dataModel.addTable('users', userSchema);
const productsTable = dataModel.addTable('products', productSchema, initialRows);

// Access tables
const table = dataModel.getTable('users');
dataModel.hasTable('users'); // true

// List all tables
dataModel.tables; // TableModel[]
dataModel.tableIds; // string[]

// Remove table (keeps FK cache)
dataModel.removeTable('users');
```

### With External FK Resolver

```typescript
const fkResolver = createForeignKeyResolver({
  loader: { ... },
  prefetch: true,
});

const dataModel = createDataModel({ fkResolver });

// Tables will use the shared resolver
const table = dataModel.addTable('products', productSchema);
table.fk === fkResolver; // true
```

### Dirty Tracking

```typescript
const dataModel = createDataModel();
const table = dataModel.addTable('users', schema);
const row = table.addRow('user-1', { name: 'John' });

row.setValue('name', 'Jane');
dataModel.isDirty; // true

// Commit all changes
dataModel.commit();
dataModel.isDirty; // false

// Or revert all changes
dataModel.revert();
```

### Cleanup

```typescript
const dataModel = createDataModel();
// ... use dataModel ...

// Dispose clears tables and internal FK resolver
dataModel.dispose();
```

## API

### Factory

```typescript
function createDataModel(options?: DataModelOptions): DataModel
```

### DataModelOptions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `reactivity` | `ReactivityAdapter` | - | MobX adapter for observability |
| `fkResolver` | `ForeignKeyResolver` | - | External resolver (creates internal if not provided) |

### DataModel Interface

```typescript
interface DataModel {
  readonly fk: ForeignKeyResolver;

  // Table management
  addTable(tableId: string, schema: JsonObjectSchema, rows?: RowData[]): TableModel;
  getTable(tableId: string): TableModel | undefined;
  removeTable(tableId: string): void;
  hasTable(tableId: string): boolean;

  readonly tables: readonly TableModel[];
  readonly tableIds: readonly string[];

  // State
  readonly isDirty: boolean;

  // Batch operations
  commit(): void;
  revert(): void;
  dispose(): void;
}
```

## Behavior Notes

- **addTable** automatically adds schema to FK resolver
- **addTable with rows** also adds rows to FK resolver
- **removeTable** removes from DataModel but keeps FK cache (for cross-table references)
- **dispose** clears tables and disposes internal FK resolver (but not external)
- **TableModels** created via addTable have access to the shared FK resolver via `table.fk`
