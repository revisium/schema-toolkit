# Core Module

Foundation layer for unified-toolkit. Contains base abstractions used by all other modules.

## Submodules

| Module | Purpose |
|--------|---------|
| `types` | Annotation types for reactivity |
| `reactivity` | ReactivityAdapter interface + noopAdapter |
| `path` | Path value object for JSON Schema navigation |
| `validation` | Schema validation engine |
| `schema-node` | Immutable schema node wrappers |
| `schema-tree` | Tree structure with indexing |
| `value-diff` | Field-level value comparison |

## Installation

```typescript
import {
  noopAdapter,
  EMPTY_PATH,
  jsonPointerToPath,
  createSchemaTree,
  createObjectNode,
  computeValueDiff,
  FieldChangeType,
} from '@revisium/schema-toolkit/core';
```

## Architecture

```text
core/
├── types/        # No dependencies
├── reactivity/   # Depends on types
├── path/         # No dependencies
├── validation/   # Depends on types
├── schema-node/  # Depends on path
├── schema-tree/  # Depends on schema-node, path
└── value-diff/   # No dependencies
```

All other unified-toolkit modules depend on core.
