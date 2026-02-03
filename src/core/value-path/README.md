# Value Path

Path abstraction for navigating value trees (e.g., `address.city`, `items[0].name`).

## Overview

This module provides a structured way to represent and manipulate paths in value data structures. Unlike `core/path` which handles JSON Schema paths (`/properties/name/items`), this module handles value paths with property access and array indexing.

## Path Format

```
name                    # Single property
address.city            # Nested property
items[0]                # Array index
items[0].name           # Property after index
users[0].addresses[1]   # Multiple indices
matrix[0][1]            # Consecutive indices
```

## API

### ValuePathSegment

```typescript
interface ValuePathSegment {
  isProperty(): boolean;
  isIndex(): boolean;
  propertyName(): string;   // throws if isIndex()
  indexValue(): number;     // throws if isProperty()
  equals(other: ValuePathSegment): boolean;
}
```

Implementations:
- `PropertySegment` - represents property access (e.g., `name`)
- `IndexSegment` - represents array index (e.g., `[0]`)

### ValuePath

```typescript
interface ValuePath {
  segments(): readonly ValuePathSegment[];
  asString(): string;
  parent(): ValuePath;
  child(name: string): ValuePath;
  childIndex(index: number): ValuePath;
  equals(other: ValuePath): boolean;
  isEmpty(): boolean;
  length(): number;
  isChildOf(parent: ValuePath): boolean;
}
```

### Parser

```typescript
// Parse string to segments
parseValuePath(path: string): ValuePathSegment[]

// Parse string to ValuePath
stringToValuePath(path: string): ValuePath
```

## Usage Examples

### Creating paths

```typescript
import {
  createValuePath,
  EMPTY_VALUE_PATH,
  PropertySegment,
  IndexSegment
} from '@revisium/schema-toolkit';

// From segments
const path = createValuePath([
  new PropertySegment('users'),
  new IndexSegment(0),
  new PropertySegment('name'),
]);
console.log(path.asString()); // 'users[0].name'

// Building with fluent API
const path2 = EMPTY_VALUE_PATH
  .child('users')
  .childIndex(0)
  .child('name');
console.log(path2.asString()); // 'users[0].name'
```

### Parsing paths

```typescript
import { stringToValuePath, parseValuePath } from '@revisium/schema-toolkit';

const path = stringToValuePath('users[0].addresses[1].city');
console.log(path.length()); // 5

const segments = parseValuePath('items[0].name');
// [PropertySegment('items'), IndexSegment(0), PropertySegment('name')]
```

### Navigation

```typescript
const path = stringToValuePath('users[0].addresses[1].city');

// Get parent
console.log(path.parent().asString()); // 'users[0].addresses[1]'

// Check relationship
const parent = stringToValuePath('users[0]');
console.log(path.isChildOf(parent)); // true
```

## Comparison with core/path

| Feature | core/path | core/value-path |
|---------|-----------|-----------------|
| Purpose | JSON Schema paths | Value data paths |
| Format | `/properties/name/items` | `name[0].city` |
| Segments | PropertySegment, ItemsSegment | PropertySegment, IndexSegment |
| Array notation | `items` (schema definition) | `[0]` (specific index) |

## Dependencies

None (standalone module)
