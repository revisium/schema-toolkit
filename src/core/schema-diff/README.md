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

Track node type changes via replacement:

```typescript
const oldNodeId = stringNode.id();
// Replace string node with number node
const newNodeId = numberNode.id();

diff.trackReplacement(oldNodeId, newNodeId);

const changes = diff.collectChanges();
// Will have 'modified' change with baseNode (string) and currentNode (number)
```

## Components

| Component | Responsibility |
|-----------|----------------|
| `SchemaDiff` | Main facade, manages base/current trees |
| `ChangeCollector` | Traverses trees, collects all raw changes |
| `ChangeCoalescer` | Filters to top-level changes only |
| `NodePathIndex` | Tracks base paths and node replacements |
| `SchemaComparator` | Deep equality comparison of nodes |
