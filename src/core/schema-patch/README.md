# schema-patch

Generates JSON Patch operations from schema tree changes with rich metadata for UI display.

## Overview

The schema-patch module provides a pipeline for converting schema tree differences into JSON Patch operations (RFC 6902) with additional metadata like type changes, formula changes, and more.

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

### SchemaPatch

Enriched patch with metadata:

```typescript
interface SchemaPatch {
  patch: JsonPatch;
  fieldName: string;
  typeChange?: { fromType: string; toType: string };
  formulaChange?: { fromFormula: string | undefined; toFormula: string | undefined };
  defaultChange?: { fromDefault: DefaultValueType; toDefault: DefaultValueType };
  descriptionChange?: { fromDescription: string | undefined; toDescription: string | undefined };
  deprecatedChange?: { fromDeprecated: boolean | undefined; toDeprecated: boolean | undefined };
  foreignKeyChange?: { fromForeignKey: string | undefined; toForeignKey: string | undefined };
  isRename?: boolean;
}
```

## Pipeline

```
SchemaTree (current) + SchemaTree (base)
    ↓
ChangeCollector → RawChange[]
    ↓
ChangeCoalescer → CoalescedChanges
    ↓
PatchGenerator → JsonPatch[]
    ↓
PatchEnricher → SchemaPatch[]
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
//   isRename: true
// }
```

### Detect type change

```typescript
const baseRoot = createObjectNode('root', 'root', [
  createStringNode('old-id', 'field'),
]);
const currentRoot = createObjectNode('root', 'root', [
  createNumberNode('new-id', 'field'),
]);

const baseTree = createSchemaTree(baseRoot);
const currentTree = createSchemaTree(currentRoot);

currentTree.trackReplacement('old-id', 'new-id');

const patches = builder.build(currentTree, baseTree);

// patches[0].typeChange:
// { fromType: 'string', toType: 'number' }
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
