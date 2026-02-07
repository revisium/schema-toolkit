# Table Model

Multi-row table model with schema, row management, formula support, and change tracking.

## Overview

The table module provides models for working with tabular data:

- **TableModel** - A container for multiple rows with shared schema, dirty tracking, rename support, and lifecycle management
- **RowModel** - A wrapper around ValueTree that represents a single row in a table, with node lookup and formula support

Each row automatically gets:
- **FormulaEngine** - reactive formula evaluation based on schema definitions
- **ChangeTracker** - JSON Patch generation for all value changes
- **TreeIndex** - node lookup by ID

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
│  │   - dispose()                                           │    │
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
│  │   - nodeById(id): node lookup by ID                     │    │
│  │   - getPatches(): JSON Patch generation                 │    │
│  │   - dispose(): cleanup FormulaEngine reactions           │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
            │
            │ wraps
            ▼
┌─────────────────────────────────────────────────────────────────┐
│  value-tree (Layer 2)                                           │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐       │
│  │ ValueTree   │  │ TreeIndex    │  │ FormulaEngine    │       │
│  │ + tracking  │  │ nodeById()   │  │ reactive eval    │       │
│  │ + patches   │  │ pathOf()     │  │ auto-recalculate │       │
│  └─────────────┘  └──────────────┘  └──────────────────┘       │
└─────────────────────────────────────────────────────────────────┘
```

## API

### RowModelOptions

```typescript
interface RowModelOptions {
  rowId: string;
  schema: JsonObjectSchema;
  data?: unknown;          // defaults to schema defaults
  fkResolver?: ForeignKeyResolver;
  refSchemas?: RefSchemas;
}
```

### createRowModel

Factory for creating standalone rows without a table:

```typescript
function createRowModel(options: RowModelOptions): RowModel;
```

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

  // Foreign keys and refs
  readonly fk: ForeignKeyResolver | undefined;
  readonly refSchemas: RefSchemas | undefined;

  // Row management
  readonly rows: readonly RowModel[];
  readonly rowCount: number;
  addRow(rowId: string, data?: unknown): RowModel;  // data defaults to schema defaults
  removeRow(rowId: string): void;                    // auto-disposes the row
  getRow(rowId: string): RowModel | undefined;
  getRowIndex(rowId: string): number;
  getRowAt(index: number): RowModel | undefined;

  // Dirty tracking
  readonly isDirty: boolean;
  commit(): void;
  revert(): void;

  // Lifecycle
  dispose(): void;  // disposes all rows (FormulaEngine reactions)
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

  // Node lookup (delegated to ValueTree)
  nodeById(id: string): ValueNode | undefined;

  // State (delegated to ValueTree)
  readonly isDirty: boolean;
  readonly isValid: boolean;
  readonly errors: readonly Diagnostic[];

  // Patch operations (delegated to ValueTree)
  getPatches(): readonly JsonValuePatch[];
  commit(): void;
  revert(): void;

  // Lifecycle
  dispose(): void;  // cleans up FormulaEngine reactions
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
  nodeById(id: string): ValueNode | undefined;
  pathOf(nodeOrId: ValueNode | string): ValuePath;
  readonly isDirty: boolean;
  readonly isValid: boolean;
  readonly errors: readonly Diagnostic[];
  getPatches(): readonly JsonValuePatch[];
  commit(): void;
  revert(): void;
  dispose(): void;
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

### Creating a standalone RowModel

```typescript
import { createRowModel } from '@revisium/schema-toolkit';

const row = createRowModel({
  rowId: 'user-1',
  schema: {
    type: 'object',
    properties: {
      name: { type: 'string', default: '' },
      age: { type: 'number', default: 0 },
    },
    additionalProperties: false,
    required: ['name', 'age'],
  },
  data: { name: 'John', age: 30 },
});

// All row operations work the same as table rows
row.getValue('name');     // 'John'
row.setValue('name', 'Jane');
row.getPatches();         // [{ op: 'replace', path: '/name', value: 'Jane' }]
row.nodeById(row.get('name').id); // ValueNode

// No table context — navigation returns defaults
row.tableModel;           // null
row.index;                // -1

// With default values (no data provided)
const emptyRow = createRowModel({ rowId: 'user-2', schema: userSchema });
emptyRow.getPlainValue(); // { name: '', age: 0 }

// Formulas work automatically
row.dispose();
```

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

// Remove row (auto-disposes FormulaEngine reactions)
table.removeRow('user-2');

// Check row count
console.log(table.rowCount); // 3
```

### Formulas

```typescript
const table = createTableModel({
  tableId: 'users',
  schema: {
    type: 'object',
    properties: {
      firstName: { type: 'string', default: '' },
      lastName: { type: 'string', default: '' },
      fullName: { type: 'string', default: '', 'x-formula': 'firstName + " " + lastName' },
    },
    additionalProperties: false,
    required: ['firstName', 'lastName', 'fullName'],
  },
  rows: [
    { rowId: 'user-1', data: { firstName: 'John', lastName: 'Doe', fullName: '' } },
  ],
});

const row = table.getRow('user-1');

// Formulas are auto-evaluated
row.getValue('fullName'); // 'John Doe'

// Formulas re-evaluate on dependency change
row.setValue('firstName', 'Jane');
row.getValue('fullName'); // 'Jane Doe'
```

### Node lookup by ID

```typescript
const row = table.getRow('user-1');
const nameNode = row.get('name');

// Find node by its ID
const found = row.nodeById(nameNode.id); // same node
```

### Change tracking and patches

```typescript
const row = table.getRow('user-1');

row.getPatches(); // []

row.setValue('name', 'Jane');
row.getPatches(); // [{ op: 'replace', path: '/name', value: 'Jane' }]

// Patches clear after commit
row.commit();
row.getPatches(); // []
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

### Lifecycle management

```typescript
// removeRow() auto-disposes the row (cleans up FormulaEngine reactions)
table.removeRow('user-1');

// dispose() disposes ALL rows
table.dispose();
console.log(table.rowCount); // 0
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
- `model/value-node` - ValueNode, NodeFactory
- `model/value-tree` - ValueTree, ValueTreeLike, TreeIndex, ChangeTracker
- `model/value-formula` - FormulaEngine (auto-attached to each row)
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

11. **Auto FormulaEngine**: Each row gets its own FormulaEngine instance automatically attached to its ValueTree. Formulas defined in the schema are evaluated reactively without any manual setup.

12. **Auto dispose on removeRow**: `removeRow()` automatically disposes the removed row, cleaning up FormulaEngine reactions. `dispose()` on TableModel disposes all rows at once.

13. **Standalone createRowModel**: `createRowModel()` provides the same row creation logic (NodeFactory + ValueTree + FormulaEngine) as `TableModel.addRow()`, but without a table context. `TableModel` uses it internally and adds `setTableModel(this)` on top.
