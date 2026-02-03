# Core Types

Type definitions for MobX-style annotations.

## API

```typescript
// Annotation type for observable properties
type AnnotationType =
  | 'observable'        // Deep observable
  | 'observable.ref'    // Reference observable (only reference changes trigger)
  | 'observable.shallow'// Shallow observable (array changes tracked, not element changes)
  | 'computed'          // Computed value
  | 'action';           // Action that mutates state

// Map of property names to their annotation types
type AnnotationsMap<T> = { [K in keyof T]?: AnnotationType };
```

## Usage

```typescript
import { makeObservable } from '@revisium/schema-toolkit/core';
import type { AnnotationsMap } from '@revisium/schema-toolkit/core';

class MyNode {
  private _value = 0;

  constructor() {
    makeObservable(this, {
      _value: 'observable',
      value: 'computed',
      setValue: 'action',
    });
  }

  get value() { return this._value; }

  setValue(v: number) { this._value = v; }
}
```
