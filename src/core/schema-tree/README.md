# Schema Tree Module

Tree structure for schema nodes with path-based navigation and indexing.

## API

```typescript
interface SchemaTree {
  root(): SchemaNode;
  nodeById(id: string): SchemaNode;
  nodeAt(path: Path): SchemaNode;
  pathOf(id: string): Path;
  nodeIds(): IterableIterator<string>;
  countNodes(): number;
  clone(): SchemaTree;
}
```

## Usage

```typescript
import {
  createSchemaTree,
  createObjectNode,
  createStringNode,
  jsonPointerToPath,
  EMPTY_PATH,
} from '@revisium/schema-toolkit/core';

const root = createObjectNode('root-id', 'root', [
  createStringNode('name-id', 'name'),
  createObjectNode('address-id', 'address', [
    createStringNode('city-id', 'city'),
  ]),
]);

const tree = createSchemaTree(root);

// Lookup by ID
tree.nodeById('city-id');           // cityNode
tree.nodeById('unknown');           // NULL_NODE

// Get path of node
tree.pathOf('city-id');             // Path: /properties/address/properties/city

// Navigate by path
const path = jsonPointerToPath('/properties/address/properties/city');
tree.nodeAt(path);                  // cityNode
tree.nodeAt(EMPTY_PATH);            // root

// Iterate all nodes
for (const id of tree.nodeIds()) {
  console.log(id, tree.pathOf(id).asSimple());
}

// Count nodes
tree.countNodes();                  // 4
```

## Cloning for Base/Current State

```typescript
const baseTree = tree.clone();

// baseTree is independent - modifications to tree don't affect it
// Use for diff generation between versions
```

## Architecture

```text
SchemaTree
    │
    ├── root (SchemaNode)
    │
    └── TreeNodeIndex
        ├── nodeIndex: Map<id, SchemaNode>
        └── pathIndex: Map<id, Path>
```

TreeNodeIndex provides O(1) lookup by ID and path computation.
