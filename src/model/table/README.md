# Table Model

Multi-row table model with schema and row management.

## Overview

The table module provides models for working with tabular data. It consists of:

- **RowModel** - A wrapper around ValueTree that represents a single row in a table
- **TableModel** (planned) - A container for multiple rows with shared schema

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  table-model                                                    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ TableModel                                              │    │
│  │   - schema: SchemaModel                                 │    │
│  │   - rows: Map<string, RowModel>                         │    │
│  │   - addRow(), removeRow(), getRow()                     │    │
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

### Creating a standalone RowModel

```typescript
import { RowModelImpl } from '@revisium/schema-toolkit';

// Create with a ValueTree
const row = new RowModelImpl('row-1', valueTree);

// Access values
const name = row.getValue('name');
row.setValue('name', 'John');

// Check state
console.log(row.isDirty);  // true after setValue
console.log(row.isValid);  // depends on validation

// Get changes
const patches = row.getPatches();

// Commit or revert
row.commit();   // saves changes
row.revert();   // discards changes
```

### Navigation (requires TableModel)

```typescript
// TableModel calls setTableModel internally when adding rows
// Navigation becomes available after row is added to table
console.log(row.index);  // 0, 1, 2, etc.
console.log(row.prev);   // previous RowModel or null
console.log(row.next);   // next RowModel or null
```

Note: `setTableModel` is an implementation detail on `RowModelImpl`, not part of the `RowModel` interface. TableModel is responsible for calling it when managing rows.

### With Reactivity

```typescript
import { RowModelImpl } from '@revisium/schema-toolkit';
import { mobxAdapter } from '@revisium/schema-toolkit-ui';

const row = new RowModelImpl('row-1', valueTree, mobxAdapter);

// Now isDirty, isValid, index, prev, next are observable
// React components wrapped with observer() will auto-update
```

## Dependencies

### Internal Dependencies

- `core/validation` - Diagnostic types for validation errors
- `core/reactivity` - ReactivityAdapter for optional MobX integration
- `types/json-value-patch.types` - JsonValuePatch type for change tracking
- `model/value-node` - ValueNode interface

### External Dependencies

None

## Design Decisions

1. **Delegation Pattern**: RowModel delegates all value operations to ValueTreeLike rather than reimplementing them. This keeps RowModel focused on row-specific concerns (navigation, table relationship).

2. **Interface-based Dependencies**: Uses `ValueTreeLike` and `TableModelLike` interfaces instead of concrete types. This allows for:
   - Easy mocking in tests
   - Flexibility in implementation
   - Breaking circular dependencies (RowModel and TableModel reference each other)

3. **Navigation as Computed Properties**: `index`, `prev`, and `next` are computed from the parent TableModel on access. This ensures they're always current without manual synchronization.

4. **Optional TableModel**: RowModel can exist without a TableModel (e.g., during creation or in standalone mode). Navigation returns safe defaults (-1, null) in this case.

5. **Reactivity-aware**: Accepts optional ReactivityAdapter for MobX integration. Without it, works as plain JavaScript object (suitable for backend).
