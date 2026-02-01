# Core Types

Type definitions for MobX-style annotations.

## API

```typescript
// Annotation type for observable properties
type AnnotationType = 'observable' | 'computed' | 'action';

// Map of property names to their annotation types
type AnnotationsMap<T> = { [K in keyof T]?: AnnotationType };
```

## Usage

```typescript
import { AnnotationsMap } from '@revisium/schema-toolkit/core';

class MyNode {
  private _value = 0;

  get value() { return this._value; }

  setValue(v: number) { this._value = v; }
}

const annotations: AnnotationsMap<MyNode> = {
  _value: 'observable',
  value: 'computed',
  setValue: 'action',
};

reactivity.makeObservable(instance, annotations);
```
