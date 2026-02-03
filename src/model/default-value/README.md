# default-value

Generates plain JSON values from JSON Schema using default values.

## API

```typescript
function generateDefaultValue(
  schema: JsonSchema | null | undefined,
  options?: GenerateDefaultValueOptions
): unknown;

interface GenerateDefaultValueOptions {
  arrayItemCount?: number;  // default: 0
  refSchemas?: Record<string, JsonSchema>;
}
```

## Usage

### Basic Types

```typescript
generateDefaultValue({ type: 'string', default: '' });       // ''
generateDefaultValue({ type: 'string', default: 'hello' });  // 'hello'
generateDefaultValue({ type: 'number', default: 0 });        // 0
generateDefaultValue({ type: 'number', default: 42 });       // 42
generateDefaultValue({ type: 'boolean', default: false });   // false
generateDefaultValue({ type: 'boolean', default: true });    // true
```

### Objects

```typescript
generateDefaultValue({
  type: 'object',
  additionalProperties: false,
  required: ['name', 'age'],
  properties: {
    name: { type: 'string', default: 'Unknown' },
    age: { type: 'number', default: 0 }
  }
});
// { name: 'Unknown', age: 0 }
```

### Arrays

```typescript
generateDefaultValue(
  { type: 'array', items: { type: 'string', default: 'item' } },
  { arrayItemCount: 3 }
);
// ['item', 'item', 'item']
```

### $ref Resolution

```typescript
generateDefaultValue(
  { $ref: 'File' },
  {
    refSchemas: {
      File: {
        type: 'object',
        additionalProperties: false,
        required: ['fileId', 'url'],
        properties: {
          fileId: { type: 'string', default: '' },
          url: { type: 'string', default: '' }
        }
      }
    }
  }
);
// { fileId: '', url: '' }
```

## Default Values by Type

| Type    | Default Value                          |
|---------|----------------------------------------|
| string  | `schema.default` or `''`               |
| number  | `schema.default` or `0`                |
| boolean | `schema.default` or `false`            |
| object  | recursively generate from properties   |
| array   | `arrayItemCount` items with defaults   |
| $ref    | resolve via `refSchemas`, then recurse |

Priority: `schema.default` > generated value
