# Table Model

Multi-row table model with schema and row management.

## Overview

The table module provides models for working with tabular data:

- **TableModel** - A container for multiple rows with shared schema, dirty tracking, and rename support
- **RowModel** - A wrapper around ValueTree that represents a single row in a table

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  table-model                                                    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ TableModel                                              │    │
│  │   - tableId / baseTableId (rename tracking)             │    │
│  │   - schema: SchemaModel                                 │    │
│  │   - rows: RowModel[]                                    │    │
│  │   - addRow(), removeRow(), getRow()                     │    │
│  │   - isDirty, commit(), revert()                         │    │
│  └────────────────────────┬────────────────────────────────┘    │
│                           │ contains                            │
│                           ▼                                     │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ RowModel                                                │    │
│  │   - rowId: string                                       │    │
│  │   - tableModel: TableModel | null (parent ref)          │    │
│  │   - tree: ValueTreeLike                                 │    │
│  │   - index, prev, next (navigation)                      │    │
│  │   - delegates: get, getValue, setValue, isDirty, etc.   │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
            │
            │ wraps
            ▼
┌─────────────────────────────────────────────────────────────────┐
│  value-node + value-formula (Layer 2)                           │
│  ┌─────────────────┐  ┌─────────────────┐                       │
│  │ ValueTree       │  │ FormulaEngine   │                       │
│  │ (value-node)    │  │ (value-formula) │                       │
│  └─────────────────┘  └─────────────────┘                       │
└─────────────────────────────────────────────────────────────────┘
```

## API

### TableModel

```typescript
interface TableModel {
  // Identity
  readonly tableId: string;
  readonly baseTableId: string;
  readonly isRenamed: boolean;
  rename(newTableId: string): void;

  // Schema
  readonly schema: SchemaModel;

  // Row management
  readonly rows: readonly RowModel[];
  readonly rowCount: number;
  addRow(rowId: string, data?: unknown): RowModel;  // data defaults to schema defaults if not provided
  removeRow(rowId: string): void;
  getRow(rowId: string): RowModel | undefined;
  getRowIndex(rowId: string): number;
  getRowAt(index: number): RowModel | undefined;

  // Dirty tracking
  readonly isDirty: boolean;
  commit(): void;
  revert(): void;
}
```

### RowModel

```typescript
interface RowModel {
  readonly rowId: string;
  readonly tableModel: TableModelLike | null;
  readonly tree: ValueTreeLike;

  // Navigation within table
  readonly index: number;        // -1 if not in table
  readonly prev: RowModel | null;
  readonly next: RowModel | null;

  // Value operations (delegated to ValueTree)
  get(path: string): ValueNode | undefined;
  getValue(path: string): unknown;
  setValue(path: string, value: unknown): void;
  getPlainValue(): unknown;

  // State (delegated to ValueTree)
  readonly isDirty: boolean;
  readonly isValid: boolean;
  readonly errors: readonly Diagnostic[];

  // Patch operations (delegated to ValueTree)
  getPatches(): readonly JsonValuePatch[];
  commit(): void;
  revert(): void;
}
```

### ValueTreeLike

Interface for ValueTree compatibility:

```typescript
interface ValueTreeLike {
  readonly root: ValueNode;
  get(path: string): ValueNode | undefined;
  getValue(path: string): unknown;
  setValue(path: string, value: unknown): void;
  getPlainValue(): unknown;
  readonly isDirty: boolean;
  readonly isValid: boolean;
  readonly errors: readonly Diagnostic[];
  getPatches(): readonly JsonValuePatch[];
  commit(): void;
  revert(): void;
}
```

### TableModelLike

Interface for TableModel compatibility (enables navigation):

```typescript
interface TableModelLike {
  getRowIndex(rowId: string): number;
  getRowAt(index: number): RowModel | undefined;
  readonly rowCount: number;
}
```

## Usage Examples

### Creating a TableModel

```typescript
import { createTableModel } from '@revisium/schema-toolkit';

const table = createTableModel({
  tableId: 'users',
  schema: {
    type: 'object',
    properties: {
      name: { type: 'string', default: '' },
      age: { type: 'number', default: 0 },
    },
    additionalProperties: false,
    required: ['name', 'age'],
  },
  rows: [
    { rowId: 'user-1', data: { name: 'John', age: 30 } },
    { rowId: 'user-2', data: { name: 'Jane', age: 25 } },
  ],
});

// Access rows
const row = table.getRow('user-1');
console.log(row?.getValue('name')); // 'John'

// Add new row with data
const newRow = table.addRow('user-3', { name: 'Bob', age: 35 });

// Add row with default values from schema
const rowWithDefaults = table.addRow('user-4');
console.log(rowWithDefaults.getPlainValue()); // { name: '', age: 0 }

// Remove row
table.removeRow('user-2');

// Check row count
console.log(table.rowCount); // 2
```

### Rename tracking

```typescript
const table = createTableModel({
  tableId: 'users',
  schema: userSchema,
});

console.log(table.isRenamed); // false

table.rename('customers');
console.log(table.tableId);     // 'customers'
console.log(table.baseTableId); // 'users'
console.log(table.isRenamed);   // true

// Commit saves the new name
table.commit();
console.log(table.baseTableId); // 'customers'
console.log(table.isRenamed);   // false

// Or revert discards the change
table.rename('clients');
table.revert();
console.log(table.tableId); // 'customers' (reverted to committed state)
```

### Dirty tracking

```typescript
const table = createTableModel({
  tableId: 'users',
  schema: userSchema,
  rows: [{ rowId: 'user-1', data: { name: 'John', age: 30 } }],
});

console.log(table.isDirty); // false

// isDirty becomes true when:
// 1. Table is renamed
table.rename('customers');
console.log(table.isDirty); // true

// 2. Schema is modified
table.schema.addField(table.schema.root().id(), 'email', 'string');
console.log(table.isDirty); // true

// 3. Any row is modified
const row = table.getRow('user-1');
row?.setValue('name', 'Jane');
console.log(table.isDirty); // true

// commit() saves all changes
table.commit();
console.log(table.isDirty); // false

// revert() discards all changes
table.rename('accounts');
table.revert();
console.log(table.isDirty); // false
```

### Row navigation

```typescript
const table = createTableModel({
  tableId: 'users',
  schema: userSchema,
});

const row1 = table.addRow('user-1');
const row2 = table.addRow('user-2');
const row3 = table.addRow('user-3');

console.log(row1.index); // 0
console.log(row2.index); // 1
console.log(row3.index); // 2

console.log(row1.prev);  // null
console.log(row1.next);  // row2

console.log(row2.prev);  // row1
console.log(row2.next);  // row3

console.log(row3.prev);  // row2
console.log(row3.next);  // null

// After removal, navigation updates
table.removeRow('user-2');
console.log(row1.next);  // row3
console.log(row3.prev);  // row1
```

### With Reactivity

```typescript
import * as mobx from 'mobx';
import { setReactivityProvider, createMobxProvider, createTableModel } from '@revisium/schema-toolkit';

// Configure MobX provider once at app initialization
setReactivityProvider(createMobxProvider(mobx));

const table = createTableModel({
  tableId: 'users',
  schema: userSchema,
});

// Now tableId, rows, rowCount, isDirty are observable
// React components wrapped with observer() will auto-update
```

## Dependencies

### Internal Dependencies

- `core/validation` - Diagnostic types for validation errors
- `core/reactivity` - Reactivity provider API
- `types/json-value-patch.types` - JsonValuePatch type for change tracking
- `model/value-node` - ValueNode, ValueTree interfaces
- `model/schema-model` - SchemaModel for schema management
- `model/default-value` - generateDefaultValue for auto-generating row data

### External Dependencies

None

## Design Decisions

1. **Facade Pattern**: TableModel is a facade over SchemaModel and RowModel[]. It provides a unified API for table operations while delegating to specialized components.

2. **Base/Current State Pattern**: Uses `tableId`/`baseTableId` pair to track rename state. `isRenamed` is computed as `tableId !== baseTableId`. Same pattern is used throughout the codebase.

3. **Delegation Pattern**: RowModel delegates all value operations to ValueTreeLike rather than reimplementing them. This keeps RowModel focused on row-specific concerns (navigation, table relationship).

4. **Interface-based Dependencies**: Uses `ValueTreeLike` and `TableModelLike` interfaces instead of concrete types. This allows for:
   - Easy mocking in tests
   - Flexibility in implementation
   - Breaking circular dependencies (RowModel and TableModel reference each other)

5. **Navigation as Computed Properties**: `index`, `prev`, and `next` are computed from the parent TableModel on access. This ensures they're always current without manual synchronization.

6. **Optional TableModel**: RowModel can exist without a TableModel (e.g., during creation or in standalone mode). Navigation returns safe defaults (-1, null) in this case.

7. **Composite isDirty**: TableModel.isDirty is true if ANY of: isRenamed, schema.isDirty(), or any row.isDirty. commit() and revert() cascade to all components.

8. **Reactivity-aware**: Uses the global reactivity provider (MobX or noop). Configure via `setReactivityProvider()` for UI usage.

9. **Factory Function**: `createTableModel()` provides a clean API and hides implementation details. Follows the same pattern as `createSchemaModel()`.

10. **Auto-generated Defaults**: When `addRow()` is called without data, `generateDefaultValue()` automatically creates row data with schema defaults. This ensures rows always have valid initial values.
