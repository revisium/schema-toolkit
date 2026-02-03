# Value Tree

Wrapper over ValueNode tree with path-based access and dirty tracking.

## Overview

ValueTree provides a convenient API for navigating and manipulating a tree of ValueNodes using string paths (e.g., `address.city`, `items[0].name`). It delegates path parsing to `core/value-path` and dirty tracking to the underlying nodes.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  ValueTree                                                      │
│    - get(path): ValueNode                                       │
│    - getValue(path): unknown                                    │
│    - setValue(path, value): void                                │
│    - isDirty, commit(), revert()                                │
└────────────────────────┬────────────────────────────────────────┘
                         │ uses
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  core/value-path                                                │
│    - parseValuePath("items[0].name")                            │
│    - PropertySegment, IndexSegment                              │
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
  setValue(path: string, value: unknown): void;
  getPlainValue(): unknown;

  // Dirty tracking
  readonly isDirty: boolean;
  commit(): void;
  revert(): void;

  // Validation
  readonly isValid: boolean;
  readonly errors: readonly Diagnostic[];

  // Patches (not yet implemented)
  getPatches(): readonly JsonValuePatch[];
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

### With Reactivity

```typescript
import { ValueTree } from '@revisium/schema-toolkit';
import { mobxAdapter } from '@revisium/schema-toolkit-ui';

const tree = new ValueTree(rootNode, mobxAdapter);

// Now isDirty, isValid, errors are observable
// React components wrapped with observer() will auto-update
```

## Error Handling

```typescript
// Non-existent path
tree.get('missing.path'); // returns undefined
tree.getValue('missing'); // returns undefined
tree.setValue('missing', 'value'); // throws Error: Path not found: missing

// Setting value on non-primitive
tree.setValue('address', {}); // throws Error: Cannot set value on non-primitive node: address
```

## Dependencies

### Internal Dependencies

- `core/value-path` - Path parsing (parseValuePath)
- `core/validation` - Diagnostic types
- `core/reactivity` - Reactivity provider API
- `model/value-node` - ValueNode, DirtyTrackable interfaces

### External Dependencies

None

## Design Decisions

1. **Delegation to value-path**: Path parsing is handled by `core/value-path` module, keeping ValueTree focused on tree navigation and state management.

2. **Delegation to nodes**: Dirty tracking (isDirty, commit, revert) is delegated to the root node which implements DirtyTrackable. ValueTree just exposes the interface.

3. **Path returns undefined**: `get()` and `getValue()` return undefined for invalid paths rather than throwing. This allows safe chaining with optional access.

4. **setValue throws**: Unlike get operations, `setValue()` throws for invalid paths or non-primitive nodes. This prevents silent failures when writing data.

5. **Reactivity-aware**: Uses the global reactivity provider (MobX or noop). Configure via `setReactivityProvider()` for UI usage.
