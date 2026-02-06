# Schema Diff Module

Compares two SchemaTree instances and collects changes. Outputs node-based changes (not JSON patches).

## API

```typescript
type ChangeType = 'added' | 'removed' | 'moved' | 'modified';

interface RawChange {
  type: ChangeType;
  baseNode: SchemaNode | null;
  currentNode: SchemaNode | null;
}

interface CoalescedChanges {
  moved: RawChange[];
  added: RawChange[];
  removed: RawChange[];
  modified: RawChange[];
}

class SchemaDiff {
  constructor(currentTree: SchemaTree);

  isDirty(): boolean;
  collectChanges(): RawChange[];
  coalesceChanges(changes?: RawChange[]): CoalescedChanges;
  trackReplacement(oldNodeId: string, newNodeId: string): void;
  markAsSaved(): void;

  get baseTree(): SchemaTree;
  get currentTree(): SchemaTree;
  get index(): NodePathIndex;
}
```

## Usage

```typescript
import { SchemaDiff, createSchemaTree } from '@revisium/schema-toolkit/core';

const tree = createSchemaTree(rootNode);
const diff = new SchemaDiff(tree);

// Check if there are changes
if (diff.isDirty()) {
  // Get raw changes (includes nested)
  const rawChanges = diff.collectChanges();

  // Get top-level changes only (nested filtered out)
  const coalesced = diff.coalesceChanges(rawChanges);

  console.log('Added:', coalesced.added.length);
  console.log('Removed:', coalesced.removed.length);
  console.log('Moved:', coalesced.moved.length);
  console.log('Modified:', coalesced.modified.length);
}

// After saving to backend
diff.markAsSaved();
```

## Type Changes

When a node's type changes but its ID is preserved (e.g., via `SchemaModel.changeFieldType`), the diff detects the modification naturally — `areNodesEqual()` compares the base and current nodes and reports a `'modified'` change.

For operations where the node ID changes (e.g., `wrapInArray`, `replaceRoot`), use `trackReplacement` to link old and new IDs:

```typescript
const oldNodeId = stringNode.id();
const newNodeId = arrayNode.id();

diff.trackReplacement(oldNodeId, newNodeId);

const changes = diff.collectChanges();
// Will have 'modified' change with baseNode (string) and currentNode (array)
```

## Move Into New Parent

When a field is moved into a newly added parent object:

```typescript
// Initial: { value, sum }
// Action: add nested object, move sum into it

// ChangeCollector detects:
// - nested: 'added'
// - sum: 'moved' (path changed from /properties/sum to /properties/nested/properties/sum)

// ChangeCoalescer keeps both:
// - 'moved' changes are NOT filtered out when parent is 'added'
// - This ensures separate add + move patches are generated
```

This enables proper JSON Patch generation:
1. `add /properties/nested` - empty object
2. `move /properties/sum → /properties/nested/properties/sum`

## Components

| Component | Responsibility |
|-----------|----------------|
| `SchemaDiff` | Main facade, manages base/current trees |
| `ChangeCollector` | Traverses trees, collects all raw changes |
| `ChangeCoalescer` | Filters to top-level changes only (except moved into added) |
| `NodePathIndex` | Tracks base paths and node replacements |
| `areNodesEqual` | Deep equality comparison of nodes (including formulas) |
| `areNodesContentEqual` | Equality without comparing names (for move+modify detection) |

## Dependencies

- `@revisium/formula` - For formula AST comparison (`serializeAst`, `replaceDependencies`)
- `../schema-node` - SchemaNode interface and Formula type
- `../schema-tree` - SchemaTree interface
- `../../model/schema-formula/serialization/FormulaPathBuilder` - For building formula path replacements
