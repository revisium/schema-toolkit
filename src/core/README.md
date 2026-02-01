# Core Module

Foundation layer for unified-toolkit. Contains base abstractions used by all other modules.

## Submodules

| Module | Purpose |
|--------|---------|
| `types` | Annotation types for reactivity |
| `reactivity` | ReactivityAdapter interface + noopAdapter |
| `path` | Path value object for JSON Schema navigation |

## Installation

```typescript
import {
  noopAdapter,
  EMPTY_PATH,
  jsonPointerToPath,
} from '@revisium/schema-toolkit/core';
```

## Architecture

```
core/
├── types/       # No dependencies
├── reactivity/  # Depends on types
└── path/        # No dependencies
```

All other unified-toolkit modules depend on core.
