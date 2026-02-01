# Value Diff Module

Computes field-level differences between two JSON values.

## API

```typescript
function computeValueDiff(fromValue: unknown, toValue: unknown): FieldChange[];

interface FieldChange {
  path: string;
  oldValue: unknown;
  newValue: unknown;
  changeType: FieldChangeType;
}

enum FieldChangeType {
  Added = 'ADDED',
  Removed = 'REMOVED',
  Modified = 'MODIFIED',
}
```

## Usage

```typescript
import { computeValueDiff, FieldChangeType } from '@revisium/schema-toolkit/core';

// Object comparison
const from = { name: 'John', age: 30 };
const to = { name: 'Jane', age: 30 };
const changes = computeValueDiff(from, to);
// [{ path: 'name', oldValue: 'John', newValue: 'Jane', changeType: 'MODIFIED' }]

// Nested objects
const from2 = { user: { name: 'John' } };
const to2 = { user: { name: 'Jane' } };
computeValueDiff(from2, to2);
// [{ path: 'user.name', oldValue: 'John', newValue: 'Jane', changeType: 'MODIFIED' }]

// Arrays
const from3 = { tags: ['a', 'b'] };
const to3 = { tags: ['a', 'b', 'c'] };
computeValueDiff(from3, to3);
// [{ path: 'tags.2', oldValue: null, newValue: 'c', changeType: 'ADDED' }]

// Primitive roots
computeValueDiff('v1.0', 'v2.0');
// [{ path: '', oldValue: 'v1.0', newValue: 'v2.0', changeType: 'MODIFIED' }]

// Null handling
computeValueDiff(null, { name: 'John' });
// [{ path: '', oldValue: null, newValue: { name: 'John' }, changeType: 'ADDED' }]
```

## Path Format

Paths use dot notation:

| Structure | Path Example |
|-----------|--------------|
| Root | `''` |
| Object field | `'name'` |
| Nested field | `'user.name'` |
| Array index | `'items.0'` |
| Nested in array | `'items.0.name'` |
