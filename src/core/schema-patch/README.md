# schema-patch

Generates JSON Patch operations from schema tree changes with rich metadata for UI display.

## Overview

The schema-patch module provides a pipeline for converting schema tree differences into JSON Patch operations (RFC 6902) with additional metadata like type changes, property changes, and more.

## Components

### PatchBuilder

Main entry point that orchestrates the entire pipeline:

```typescript
import { PatchBuilder } from '@revisium/schema-toolkit/core';

const builder = new PatchBuilder();
const patches = builder.build(currentTree, baseTree);
```

### PatchGenerator

Converts coalesced changes into JSON Patch operations:

```typescript
import { PatchGenerator } from '@revisium/schema-toolkit/core';

const generator = new PatchGenerator(currentTree, baseTree);
const jsonPatches = generator.generate(coalescedChanges);
```

### PatchEnricher

Adds metadata to JSON Patches for UI display:

```typescript
import { PatchEnricher } from '@revisium/schema-toolkit/core';

const enricher = new PatchEnricher(currentTree, baseTree);
const schemaPatch = enricher.enrich(jsonPatch);
```

## Types

### JsonPatch

Standard JSON Patch operation:

```typescript
interface JsonPatch {
  op: 'add' | 'remove' | 'replace' | 'move';
  path: string;
  from?: string;
  value?: JsonSchema;
}
```

### PropertyName

Identifies which property changed:

```typescript
type PropertyName =
  | 'formula'
  | 'default'
  | 'description'
  | 'deprecated'
  | 'foreignKey'
  | 'contentMediaType'
  | 'ref'
  | 'title';
```

### PropertyChange

Represents a single property change with before/after values:

```typescript
interface PropertyChange {
  property: PropertyName;
  from: unknown;
  to: unknown;
}
```

### SchemaPatch

Enriched patch with metadata:

```typescript
interface SchemaPatch {
  patch: JsonPatch;
  fieldName: string;
  typeChange?: { fromType: string; toType: string };
  isRename?: boolean;
  movesIntoArray?: boolean;
  propertyChanges: PropertyChange[];
}
```

### Working with propertyChanges

The `propertyChanges` array contains only properties that actually changed. To find a specific change:

```typescript
const formulaChange = patch.propertyChanges.find(c => c.property === 'formula');
if (formulaChange) {
  console.log(`Formula: ${formulaChange.from} -> ${formulaChange.to}`);
}

const descriptionChange = patch.propertyChanges.find(c => c.property === 'description');
if (descriptionChange) {
  console.log(`Description: ${descriptionChange.from} -> ${descriptionChange.to}`);
}
```

For add patches, `from` is always `undefined`. For replace patches, both `from` and `to` reflect the actual values.

## Pipeline

```text
SchemaTree (current) + SchemaTree (base)
    |
ChangeCollector -> RawChange[]
    |
ChangeCoalescer -> CoalescedChanges
    |
PatchGenerator -> JsonPatch[]
    |
PatchEnricher -> SchemaPatch[]
```

## Patch Ordering

Patches are ordered for safe sequential application:

1. **Prerequisite Adds** - Parent containers needed for moves
2. **Moves** - Rename/relocate operations
3. **Replaces** - Modification patches
4. **Regular Adds** - New field additions
5. **Removes** - Field deletions

## Examples

### Detect field rename

```typescript
const baseRoot = createObjectNode('root', 'root', [
  createStringNode('field-id', 'oldName'),
]);
const currentRoot = createObjectNode('root', 'root', [
  createStringNode('field-id', 'newName'),
]);

const baseTree = createSchemaTree(baseRoot);
const currentTree = createSchemaTree(currentRoot);

const builder = new PatchBuilder();
const patches = builder.build(currentTree, baseTree);

// patches[0]:
// {
//   patch: { op: 'move', from: '/properties/oldName', path: '/properties/newName' },
//   fieldName: 'newName',
//   isRename: true,
//   propertyChanges: []
// }
```

### Detect type change

When using `SchemaModel.changeFieldType`, node ID is preserved and `trackReplacement` is not needed — the diff detects the change naturally:

```typescript
const baseRoot = createObjectNode('root', 'root', [
  createStringNode('field-id', 'field'),
]);
const currentRoot = createObjectNode('root', 'root', [
  createNumberNode('field-id', 'field'),
]);

const baseTree = createSchemaTree(baseRoot);
const currentTree = createSchemaTree(currentRoot);

const patches = builder.build(currentTree, baseTree);

// patches[0].typeChange:
// { fromType: 'string', toType: 'number' }
```

For operations where the node ID changes (e.g., `wrapInArray`, `replaceRoot`), use `trackReplacement`:

```typescript
currentTree.trackReplacement('old-id', 'new-id');
```

### Detect property changes

```typescript
// patches[0].propertyChanges:
// [
//   { property: 'description', from: 'old desc', to: 'new desc' },
//   { property: 'deprecated', from: undefined, to: true }
// ]
```

### Array items changes

```typescript
// Field name for array items uses [*] notation:
// - 'items[*].name' for field inside array items
// - 'items[*]' for the array items type itself
```

## Dependencies

- schema-diff: Change collection and coalescing
- schema-serializer: Node to JSON Schema conversion
- path: JSON Pointer handling
