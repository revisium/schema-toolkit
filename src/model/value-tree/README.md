# Value Tree

Wrapper over ValueNode tree with path-based access, change tracking, node indexing, formula support, and dirty tracking.

## Overview

ValueTree provides a convenient API for navigating and manipulating a tree of ValueNodes using string paths (e.g., `address.city`, `items[0].name`). It delegates path parsing to `core/value-path` and dirty tracking to the underlying nodes.

Key capabilities:
- **Path-based access** - get/set values using dot-notation paths
- **Node indexing** - find nodes by ID, compute paths for any node (via TreeIndex)
- **Change tracking** - records changes and generates JSON Patch operations (via ChangeTracker)
- **Formula support** - reactive formula evaluation (via FormulaEngine)
- **Dirty tracking** - delegated to underlying ValueNodes
- **Lifecycle management** - `dispose()` cleans up FormulaEngine reactions

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  ValueTree                                                      │
│    - get(path), getValue(path), setValue(path, value)           │
│    - nodeById(id), pathOf(node)         → TreeIndex             │
│    - getPatches(), trackChange()        → ChangeTracker         │
│    - setFormulaEngine(), formulaEngine  → FormulaEngine         │
│    - isDirty, commit(), revert()                                │
│    - dispose()                                                  │
└────────────────────────┬────────────────────────────────────────┘
                         │ uses
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────────┐
│  TreeIndex   │ │ChangeTracker │ │  FormulaEngine   │
│  nodeById()  │ │  track()     │ │  (value-formula) │
│  pathOf()    │ │  toPatches() │ │  reactive eval   │
│  rebuild()   │ │  clear()     │ │  dispose()       │
└──────────────┘ └──────────────┘ └──────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│  core/value-path                                                │
│    - parseValuePath("items[0].name")                            │
│    - PropertySegment, IndexSegment                              │
│    - ValuePath.asJsonPointer() → "/items/0/name"                │
└─────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│  value-node                                                     │
│    - ObjectValueNode.child(name)                                │
│    - ArrayValueNode.at(index)                                   │
│    - PrimitiveValueNode.setValue(value)                         │
└─────────────────────────────────────────────────────────────────┘
```

## API

### ValueTreeLike

```typescript
interface ValueTreeLike {
  readonly root: ValueNode;

  // Path-based access
  get(path: string): ValueNode | undefined;
  getValue(path: string): unknown;
  setValue(path: string, value: unknown, options?: { internal?: boolean }): void;
  getPlainValue(): unknown;

  // Node indexing
  nodeById(id: string): ValueNode | undefined;
  pathOf(nodeOrId: ValueNode | string): ValuePath;

  // Dirty tracking
  readonly isDirty: boolean;
  commit(): void;
  revert(): void;

  // Validation
  readonly isValid: boolean;
  readonly errors: readonly Diagnostic[];

  // Patches
  getPatches(): readonly JsonValuePatch[];

  // Lifecycle
  dispose(): void;
}
```

### Change (Discriminated Union)

```typescript
interface BaseChange {
  readonly path: ValuePath;
}

interface SetValueChange extends BaseChange {
  readonly type: 'setValue';
  readonly value: JsonValue;
  readonly oldValue: JsonValue;
}

interface AddPropertyChange extends BaseChange {
  readonly type: 'addProperty';
  readonly value: JsonValue;
}

interface RemovePropertyChange extends BaseChange {
  readonly type: 'removeProperty';
}

interface ArrayPushChange extends BaseChange {
  readonly type: 'arrayPush';
  readonly value: JsonValue;
}

interface ArrayInsertChange extends BaseChange {
  readonly type: 'arrayInsert';
  readonly index: number;
  readonly value: JsonValue;
}

interface ArrayRemoveChange extends BaseChange {
  readonly type: 'arrayRemove';
  readonly index: number;
}

interface ArrayMoveChange extends BaseChange {
  readonly type: 'arrayMove';
  readonly fromIndex: number;
  readonly toIndex: number;
}

interface ArrayReplaceChange extends BaseChange {
  readonly type: 'arrayReplace';
  readonly index: number;
  readonly value: JsonValue;
}

interface ArrayClearChange extends BaseChange {
  readonly type: 'arrayClear';
}

type Change =
  | SetValueChange
  | AddPropertyChange
  | RemovePropertyChange
  | ArrayPushChange
  | ArrayInsertChange
  | ArrayRemoveChange
  | ArrayMoveChange
  | ArrayReplaceChange
  | ArrayClearChange;
```

### TreeIndex

```typescript
class TreeIndex {
  nodeById(id: string): ValueNode | undefined;
  pathOf(node: ValueNode): ValuePath;
  rebuild(): void;
  registerNode(node: ValueNode): void;
  invalidatePathsUnder(node: ValueNode): void;
}
```

### ChangeTracker

```typescript
class ChangeTracker {
  readonly changes: readonly Change[];
  readonly hasChanges: boolean;
  track(change: Change): void;
  clear(): void;
  toPatches(): readonly JsonValuePatch[];
}
```

## Path Syntax

```
name                    # Property access
address.city            # Nested property
items[0]                # Array index
items[0].name           # Property after index
users[0].addresses[1]   # Multiple indices
```

## Usage Examples

### Creating a ValueTree

```typescript
import { createNodeFactory } from '@revisium/schema-toolkit';
import { ValueTree } from '@revisium/schema-toolkit';

const factory = createNodeFactory();
const rootNode = factory.createTree(schema, data);
const tree = new ValueTree(rootNode);
```

### Path-based access

```typescript
// Get node at path
const node = tree.get('address.city');

// Get value at path
const city = tree.getValue('address.city'); // 'NYC'

// Set value at path
tree.setValue('address.city', 'LA');

// Get full tree as plain object
const data = tree.getPlainValue();
```

### Node indexing

```typescript
// Find node by ID
const node = tree.get('name');
const found = tree.nodeById(node.id); // same node

// Get path for a node
const path = tree.pathOf(node);
path.asString();      // 'name'
path.asJsonPointer(); // '/name'

// Get path by node ID
const path2 = tree.pathOf(node.id);

// Unknown ID returns empty path
const empty = tree.pathOf('unknown-id');
empty.isEmpty(); // true
```

### Change tracking and patches

```typescript
const tree = new ValueTree(rootNode);

tree.getPatches(); // []

tree.setValue('name', 'Jane');
tree.getPatches(); // [{ op: 'replace', path: '/name', value: 'Jane' }]

tree.setValue('age', 25);
tree.getPatches(); // [
//   { op: 'replace', path: '/name', value: 'Jane' },
//   { op: 'replace', path: '/age', value: 25 },
// ]

// Track custom changes (for array operations, property add/remove)
tree.trackChange({
  type: 'addProperty',
  path: tree.pathOf(parentNode).child('email'),
  value: '',
});

// commit() and revert() clear patches
tree.commit();
tree.getPatches(); // []
```

### Formula support

```typescript
import { FormulaEngine } from '@revisium/schema-toolkit';

const tree = new ValueTree(rootNode);
const engine = new FormulaEngine(tree);
tree.setFormulaEngine(engine);

// Formulas are evaluated automatically
tree.getValue('fullName'); // computed from formula

// Formulas re-evaluate on dependency change
tree.setValue('firstName', 'Jane');
tree.getValue('fullName'); // updated automatically

// Access engine
tree.formulaEngine; // FormulaEngine instance
```

### Dirty tracking

```typescript
console.log(tree.isDirty); // false

tree.setValue('name', 'Jane');
console.log(tree.isDirty); // true

// Save changes
tree.commit();
console.log(tree.isDirty); // false

// Or discard changes
tree.setValue('name', 'Bob');
tree.revert();
console.log(tree.getValue('name')); // 'Jane' (reverted to committed state)
```

### Lifecycle

```typescript
// dispose() cleans up FormulaEngine reactions
tree.dispose();
tree.formulaEngine; // null
```

### With Reactivity

```typescript
import * as mobx from 'mobx';
import { setReactivityProvider, createMobxProvider, ValueTree } from '@revisium/schema-toolkit';

// Configure MobX provider once at app initialization
setReactivityProvider(createMobxProvider(mobx));

const tree = new ValueTree(rootNode);

// Now isDirty, isValid, errors are observable
// React components wrapped with observer() will auto-update
```

## Error Handling

```typescript
// Non-existent path
tree.get('missing.path'); // returns undefined
tree.getValue('missing'); // returns undefined
tree.setValue('missing', 'value'); // throws Error: Path not found: missing
```

## Dependencies

### Internal Dependencies

- `core/value-path` - Path parsing (parseValuePath), ValuePath interface
- `core/validation` - Diagnostic types
- `core/reactivity` - Reactivity provider API
- `model/value-node` - ValueNode, DirtyTrackable interfaces
- `model/value-formula` - FormulaEngine (optional, attached via setFormulaEngine)

### External Dependencies

None

## Design Decisions

1. **Delegation to value-path**: Path parsing is handled by `core/value-path` module, keeping ValueTree focused on tree navigation and state management.

2. **Delegation to nodes**: Dirty tracking (isDirty, commit, revert) is delegated to the root node which implements DirtyTrackable. ValueTree just exposes the interface.

3. **Path returns undefined**: `get()` and `getValue()` return undefined for invalid paths rather than throwing. This allows safe chaining with optional access.

4. **setValue throws for invalid paths**: Unlike get operations, `setValue()` throws for invalid paths. For object nodes it performs a partial update (only keys present in value), for array nodes it performs a full replacement (resize + update). Supports `options.internal` to bypass readOnly/formula restrictions.

5. **Reactivity-aware**: Uses the global reactivity provider (MobX or noop). Configure via `setReactivityProvider()` for UI usage.

6. **TreeIndex for ID-based lookup**: Provides O(1) node lookup by ID and cached path computation. Paths for nodes inside arrays are computed dynamically (indices change on mutations).

7. **ChangeTracker with discriminated union**: Each change type (setValue, addProperty, arrayPush, etc.) has its own interface with only the fields it needs. This enables exhaustive switch/case handling without default branches.

8. **FormulaEngine as optional attachment**: FormulaEngine is not created by ValueTree itself — it's attached via `setFormulaEngine()`. This keeps ValueTree independent and allows the caller to decide whether formulas are needed.

9. **dispose() for cleanup**: Disposes FormulaEngine reactions. Important when rows are removed from a table to prevent memory leaks from orphaned MobX reactions.
