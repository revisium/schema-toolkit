# Path Module

Immutable value object for JSON Schema paths. Encapsulates path operations instead of raw string manipulation.

## API

```typescript
interface Path {
  segments(): readonly PathSegment[];
  asJsonPointer(): string;  // "/properties/user/properties/name"
  asSimple(): string;       // "user.name" or "items[*].value"
  parent(): Path;
  child(name: string): Path;
  childItems(): Path;
  equals(other: Path): boolean;
  isEmpty(): boolean;
  length(): number;
  isChildOf(parent: Path): boolean;
}

interface PathSegment {
  isProperty(): boolean;
  isItems(): boolean;
  propertyName(): string;
  equals(other: PathSegment): boolean;
}

// Factory functions
const EMPTY_PATH: Path;
function createPath(segments: readonly PathSegment[]): Path;
function jsonPointerToPath(pointer: string): Path;
function jsonPointerToSimplePath(pointer: string): string;
```

## Usage

**Building paths:**
```typescript
import { EMPTY_PATH } from '@revisium/schema-toolkit/core';

const path = EMPTY_PATH.child('user').child('name');
path.asJsonPointer(); // "/properties/user/properties/name"
path.asSimple();      // "user.name"
```

**Array paths:**
```typescript
const path = EMPTY_PATH.child('items').childItems().child('price');
path.asSimple(); // "items[*].price"
```

**Parsing from JSON Pointer:**
```typescript
import { jsonPointerToPath } from '@revisium/schema-toolkit/core';

const path = jsonPointerToPath('/properties/user/items/properties/name');
path.asSimple(); // "user[*].name"
```

**Navigation:**
```typescript
const parent = path.parent();
const nested = path.child('email');
const isChild = nested.isChildOf(path); // true
```

## Design Notes

- All Path instances are immutable
- EMPTY_PATH is a singleton for root/empty paths
- PropertySegment represents object properties
- ItemsSegment represents array items (`[*]`)
