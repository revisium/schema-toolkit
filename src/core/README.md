# Core Module

Foundation layer for unified-toolkit. Contains base abstractions used by all other modules.

## Submodules

| Module | Purpose |
|--------|---------|
| `types` | Annotation types for reactivity |
| `reactivity` | MobX-compatible API with provider pattern |
| `path` | Path value object for JSON Schema navigation |
| `validation` | Schema validation engine |
| `schema-node` | Immutable schema node wrappers |
| `schema-tree` | Tree structure with indexing |
| `schema-diff` | Tree comparison, change collection |
| `schema-serializer` | SchemaNode → JsonSchema serialization |
| `value-diff` | Field-level value comparison |

## Exports

```typescript
// types
export type { AnnotationType, AnnotationsMap } from '@revisium/schema-toolkit/core';

// reactivity
export {
  makeObservable,
  makeAutoObservable,
  observable,
  runInAction,
  reaction,
  setReactivityProvider,
  resetReactivityProvider,
  createMobxProvider,
} from '@revisium/schema-toolkit/core';
export type { ReactivityProvider } from '@revisium/schema-toolkit/core';

// path
export { EMPTY_PATH, createPath, jsonPointerToPath } from '@revisium/schema-toolkit/core';
export type { Path, PathSegment } from '@revisium/schema-toolkit/core';

// validation
export { ValidationEngine, ValidatorRegistry, createValidationEngine } from '@revisium/schema-toolkit/core';
export type { Validator, ValidatorRule, Diagnostic } from '@revisium/schema-toolkit/core';

// schema-node
export { createObjectNode, createArrayNode, createStringNode, createNumberNode, createBooleanNode, createRefNode, NULL_NODE } from '@revisium/schema-toolkit/core';
export type { SchemaNode, NodeType, NodeMetadata, Formula } from '@revisium/schema-toolkit/core';

// schema-tree
export { createSchemaTree } from '@revisium/schema-toolkit/core';
export type { SchemaTree } from '@revisium/schema-toolkit/core';

// schema-diff
export { SchemaDiff, ChangeCollector, ChangeCoalescer, NodePathIndex, areNodesEqual } from '@revisium/schema-toolkit/core';
export type { RawChange, CoalescedChanges, ChangeType } from '@revisium/schema-toolkit/core';

// schema-serializer
export { SchemaSerializer } from '@revisium/schema-toolkit/core';
export type { SerializeOptions } from '@revisium/schema-toolkit/core';

// value-diff
export { computeValueDiff, FieldChangeType } from '@revisium/schema-toolkit/core';
export type { FieldChange } from '@revisium/schema-toolkit/core';
```

## Architecture

```text
core/
├── types/             # No dependencies
├── reactivity/        # Depends on types
├── path/              # No dependencies
├── validation/        # Depends on types
├── schema-node/       # Depends on path
├── schema-tree/       # Depends on schema-node, path
├── schema-diff/       # Depends on schema-tree, schema-node, path
├── schema-serializer/ # Depends on schema-node, schema-tree, types
└── value-diff/        # No dependencies
```

All other unified-toolkit modules depend on core.
