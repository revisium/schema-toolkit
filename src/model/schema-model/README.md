# schema-model

Mutable model for JSON Schema editing with change tracking and patch generation.

## Overview

`SchemaModel` wraps the immutable `SchemaTree` (from Layer 1) and provides:
- Mutable operations (add, remove, rename, update fields)
- Optional reactivity through `ReactivityAdapter`
- Change tracking (base tree vs current tree)
- Patch generation using `schema-diff` + `schema-patch`

## API

### Creating a Model

```typescript
import { createSchemaModel } from '@revisium/schema-toolkit';
import type { JsonObjectSchema } from '@revisium/schema-toolkit';

const schema: JsonObjectSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['name', 'age'],
  properties: {
    name: { type: 'string', default: '' },
    age: { type: 'number', default: 0 },
  },
};

const model = createSchemaModel(schema);
```

### Tree Access

```typescript
// Get root node
const root = model.root;

// Find node by ID
const node = model.nodeById('node-id');

// Get path for node
const path = model.pathOf('node-id');
```

### Mutations

```typescript
// Add field
const newField = model.addField(parentId, 'email', 'string');

// Remove field
model.removeField(nodeId);

// Rename field
model.renameField(nodeId, 'newName');

// Change field type
const newNode = model.changeFieldType(nodeId, 'number');

// Update metadata
model.updateMetadata(nodeId, {
  title: 'User Name',
  description: 'Full name of the user',
  deprecated: false,
});

// Update formula
model.updateFormula(nodeId, 'price * quantity');

// Update foreign key
model.updateForeignKey(nodeId, 'categories');

// Update default value
model.updateDefaultValue(nodeId, 'default text');
```

### State Management

```typescript
// Check if there are unsaved changes
if (model.isDirty) {
  // Get patches for changes
  const patches = model.patches;

  // Or get plain JSON patches
  const jsonPatches = model.jsonPatches;

  // Save current state as base
  model.markAsSaved();
}

// Revert all changes since last save
model.revert();

// Get serialized schema
const plainSchema = model.plainSchema;

// Generate default values from schema
const defaults = model.generateDefaultValue();
// { name: '', age: 0 }

// Generate with array items
const defaultsWithArrays = model.generateDefaultValue({ arrayItemCount: 2 });
```

### Validation

```typescript
// Check if schema is valid
if (model.isValid) {
  // Schema has no validation errors
}

// Get validation errors
const errors = model.validationErrors;
// Returns: SchemaValidationError[]

// Get formula errors
const formulaErrors = model.formulaErrors;
// Returns: FormulaValidationError[]

// Get node count
const count = model.nodeCount;
```

### With Reactivity (MobX)

```typescript
import { createSchemaModel } from '@revisium/schema-toolkit';
import { mobxAdapter } from '@revisium/schema-toolkit-ui';

const model = createSchemaModel(schema, { reactivity: mobxAdapter });

// Now model properties are observable
// - root, isDirty, patches, etc. will trigger MobX reactions
```

## Computed Properties

When reactivity is enabled, the following properties are MobX computed (cached until dependencies change):

| Property | Description |
|----------|-------------|
| `root` | Root schema node |
| `isDirty` | Whether schema has unsaved changes |
| `isValid` | Whether schema has no errors |
| `patches` | List of schema patches with metadata |
| `jsonPatches` | List of JSON Patch operations |
| `plainSchema` | Serialized JSON Schema |
| `validationErrors` | Schema validation errors |
| `formulaErrors` | Formula validation errors |
| `nodeCount` | Total number of nodes in tree |

### Performance Benefits

Without reactivity, each property access recalculates the value. With reactivity, results are cached:

```typescript
// Without reactivity - recalculates each time
const errors1 = model.validationErrors; // traverses tree
const errors2 = model.validationErrors; // traverses tree again

// With reactivity - cached
const errors1 = model.validationErrors; // traverses tree, caches result
const errors2 = model.validationErrors; // returns cached result
model.renameField(nodeId, 'newName');   // invalidates cache
const errors3 = model.validationErrors; // traverses tree, caches new result
```

## Field Types

Supported field types for `addField` and `changeFieldType`:
- `'string'` - String field with default `''`
- `'number'` - Number field with default `0`
- `'boolean'` - Boolean field with default `false`
- `'object'` - Empty object
- `'array'` - Array with string items

## Patches

The model generates enriched patches with metadata:

```typescript
interface SchemaPatch {
  patch: JsonPatch;           // Standard JSON Patch
  fieldName: string;          // Human-readable field path
  typeChange?: {              // Present for type changes
    fromType: string;
    toType: string;
  };
  formulaChange?: {           // Present for formula changes
    fromFormula: string | undefined;
    toFormula: string | undefined;
  };
  defaultChange?: {           // Present for default value changes
    fromDefault: unknown;
    toDefault: unknown;
  };
  isRename?: boolean;         // True for move patches that are renames
}
```

## Architecture

```
SchemaModel
├── SchemaParser      - Parses JsonObjectSchema → SchemaNode tree
├── NodeFactory       - Creates new SchemaNode instances
├── SchemaTree        - Internal mutable tree (from core)
├── PatchBuilder      - Generates patches (from core)
└── SchemaSerializer  - Serializes tree to JSON (from core)
```

## Dependencies

- `core/schema-node` - Immutable node types
- `core/schema-tree` - Tree structure and navigation
- `core/schema-diff` - Change detection
- `core/schema-patch` - Patch generation
- `core/schema-serializer` - JSON Schema serialization
- `core/reactivity` - Optional reactivity adapter
