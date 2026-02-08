# Typed Value API

Compile-time type safety for schema-toolkit value trees. Zero runtime cost — pure type-level layer on top of the existing untyped API.

## With helper functions

```typescript
import { obj, str, num, bool, arr, createTypedTree } from '@revisium/schema-toolkit';

const schema = obj({
  name: str(),
  age: num(),
  active: bool(),
  address: obj({
    city: str(),
    zip: str(),
  }),
  tags: arr(str()),
});

const tree = createTypedTree(schema, {
  name: 'John',
  age: 30,
  active: true,
  address: { city: 'NYC', zip: '10001' },
  tags: ['dev'],
});

// Chained access — full autocomplete and type safety
tree.root.child('name').value;                        // string
tree.root.child('address').child('city').value;       // string
tree.root.child('tags').at(0)?.value;                 // string
tree.root.child('address').getPlainValue();           // { city: string, zip: string }
tree.root.getPlainValue();                            // full typed object

// Type-safe setValue
tree.root.child('name').setValue('Jane');              // OK
tree.root.child('name').setValue(42);                  // TS Error!
tree.root.child('address').setValue({ city: 'LA' });  // OK (Partial)

// Path strings
tree.get('address.city');        // TypedPrimitiveValueNode<string>
tree.getValue('name');           // string
tree.setValue('age', 25);        // OK
tree.setValue('age', 'wrong');   // TS Error!
```

## From a plain TypeScript type (`SchemaFromValue`)

If you already have a TypeScript type for your data, you can use `SchemaFromValue` to derive the schema shape automatically — no need to write schema objects at all:

```typescript
import type { SchemaFromValue, NodeFromValue, ValuePaths } from '@revisium/schema-toolkit';
import type { TypedRowModel } from '@revisium/schema-toolkit';

// Your plain TypeScript type
type User = {
  firstName: string;
  age: number;
  active: boolean;
  address: {
    city: string;
    zip: string;
  };
  tags: string[];
};

// Derive schema type automatically
type UserSchema = SchemaFromValue<User>;

// Use with typed row model
declare const row: TypedRowModel<UserSchema>;
row.getValue('firstName');          // string
row.getValue('address.city');       // string
row.getPlainValue();                // User

// Get typed node
type UserNode = NodeFromValue<User>;
// = TypedObjectValueNode<{ firstName: { type: 'string' }; age: { type: 'number' }; ... }>

// Get all valid paths
type UserPaths = ValuePaths<User>;
// = 'firstName' | 'age' | 'active' | 'address' | 'address.city' | 'address.zip' | 'tags' | ...
```

## Typed RowModel and TableModel

`createRowModel` and `createTableModel` use overloads: when a typed schema is passed (via helpers or `as const`), they return `TypedRowModel<S>` / `TypedTableModel<S>` with full type safety. When an untyped `JsonSchema` / `JsonObjectSchema` is passed, they return the plain `RowModel` / `TableModel` as before.

### `createRowModel`

```typescript
import { obj, str, num, createRowModel } from '@revisium/schema-toolkit';

// Typed — schema preserves literal types
const schema = obj({
  name: str(),
  price: num(),
});

const row = createRowModel({
  rowId: 'row-1',
  schema,
  data: { name: 'Widget', price: 9.99 },
});

row.getValue('name');              // string
row.getValue('price');             // number
row.getPlainValue();               // { name: string, price: number }
row.setValue('price', 19.99);      // OK
row.setValue('price', 'wrong');    // TS Error!
```

```typescript
import { createRowModel } from '@revisium/schema-toolkit';
import type { JsonObjectSchema } from '@revisium/schema-toolkit';

// Untyped — plain RowModel, same as before
const schema: JsonObjectSchema = getSchemaFromApi();
const row = createRowModel({ rowId: 'row-1', schema, data });

row.getValue('name');              // unknown
row.getPlainValue();               // unknown
```

### `createTableModel`

```typescript
import { obj, str, num, bool, createTableModel } from '@revisium/schema-toolkit';

// Typed
const schema = obj({
  title: str(),
  price: num(),
  inStock: bool(),
});

const table = createTableModel({
  tableId: 'products',
  schema,
  rows: [
    { rowId: 'p1', data: { title: 'Laptop', price: 999, inStock: true } },
    { rowId: 'p2', data: { title: 'Mouse', price: 29, inStock: false } },
  ],
});

// All rows are typed
const row = table.getRow('p1');
row?.getValue('title');            // string
row?.getPlainValue();              // { title: string, price: number, inStock: boolean }

// addRow is typed
const newRow = table.addRow('p3', { title: 'KB', price: 79, inStock: true });
newRow.setValue('price', 89);      // OK
newRow.setValue('price', 'wrong'); // TS Error!
```

```typescript
import { createTableModel } from '@revisium/schema-toolkit';
import type { JsonObjectSchema } from '@revisium/schema-toolkit';

// Untyped — plain TableModel, same as before
const schema: JsonObjectSchema = getSchemaFromApi();
const table = createTableModel({ tableId: 'products', schema, rows });

table.getRow('p1')?.getValue('title');  // unknown
table.addRow('p3', data);               // RowModel (untyped)
```

## Without helper functions (plain objects)

If your schema comes from a runtime source (API, database, config file), or you simply prefer not to use the helper functions, you can define the schema type manually.

### Option 1: `as const` assertion

```typescript
import { createTypedTree } from '@revisium/schema-toolkit';

const schema = {
  type: 'object',
  additionalProperties: false,
  required: ['name', 'age', 'address', 'tags'],
  properties: {
    name: { type: 'string', default: '' },
    age: { type: 'number', default: 0 },
    address: {
      type: 'object',
      additionalProperties: false,
      required: ['city', 'zip'],
      properties: {
        city: { type: 'string', default: '' },
        zip: { type: 'string', default: '' },
      },
    },
    tags: {
      type: 'array',
      items: { type: 'string', default: '' },
    },
  },
} as const;

const tree = createTypedTree(schema, {
  name: 'John',
  age: 30,
  address: { city: 'NYC', zip: '10001' },
  tags: ['dev'],
});

tree.root.child('name').value;   // string
tree.root.child('age').value;    // number
tree.getValue('address.city');   // string
```

The `as const` assertion preserves literal types (`'string'` instead of `string`), which is required for type inference to work.

### Option 2: Explicit schema type declaration

When you have a schema that comes from an external source at runtime, you can declare the schema type separately:

```typescript
import { createTypedTree } from '@revisium/schema-toolkit';

type UserSchema = {
  type: 'object';
  additionalProperties: false;
  required: string[];
  properties: {
    name: { type: 'string'; default: '' };
    age: { type: 'number'; default: 0 };
    address: {
      type: 'object';
      additionalProperties: false;
      required: string[];
      properties: {
        city: { type: 'string'; default: '' };
        zip: { type: 'string'; default: '' };
      };
    };
  };
};

const schema: UserSchema = loadSchemaFromSomewhere();

const tree = createTypedTree(schema, {
  name: 'John',
  age: 30,
  address: { city: 'NYC', zip: '10001' },
});

tree.root.child('name').value;   // string
tree.getValue('address.city');   // string
```

### Option 3: Plain TS type via `SchemaFromValue`

The simplest approach — just declare your data type and derive everything else:

```typescript
import { createRowModel } from '@revisium/schema-toolkit';
import type { SchemaFromValue } from '@revisium/schema-toolkit';

type User = {
  name: string;
  age: number;
  address: { city: string };
};

type UserSchema = SchemaFromValue<User>;

// Pass a real JSON Schema object at runtime, but type it as UserSchema
const schema = {
  type: 'object',
  additionalProperties: false,
  required: ['name', 'age', 'address'],
  properties: {
    name: { type: 'string', default: '' },
    age: { type: 'number', default: 0 },
    address: {
      type: 'object',
      additionalProperties: false,
      required: ['city'],
      properties: {
        city: { type: 'string', default: '' },
      },
    },
  },
} as unknown as UserSchema;

const row = createRowModel({
  rowId: 'u1',
  schema: schema as any,  // runtime schema is untyped
  data: { name: 'John', age: 30, address: { city: 'NYC' } },
});

row.getValue('name');            // string
row.getValue('address.city');    // string
row.getPlainValue();             // User
```

### Option 4: Type an existing untyped node

If you already have an untyped `ValueNode` (e.g., from the existing API), you can cast it:

```typescript
import { typedNode } from '@revisium/schema-toolkit';

const typedRoot = typedNode<UserSchema>(untypedTree.root);
typedRoot.child('name').value;  // string
```

## Type utilities reference

| Type | Description |
|------|-------------|
| `InferValue<S>` | Maps schema type `S` to the plain TypeScript value |
| `InferNode<S>` | Maps schema type `S` to the typed `ValueNode` interface |
| `SchemaFromValue<T>` | Maps a plain TS value type `T` to a virtual schema shape |
| `NodeFromValue<T>` | `InferNode<SchemaFromValue<T>>` — typed node from value type |
| `ValuePaths<T>` | `SchemaPaths<SchemaFromValue<T>>` — valid paths from value type |
| `SchemaPaths<S>` | Union of all valid dot-separated paths in schema `S` |
| `SchemaAtPath<S, P>` | Resolves the sub-schema at path `P` within `S` |
| `NodeAtPath<S, P>` | `InferNode<SchemaAtPath<S, P>>` |
| `ValueAtPath<S, P>` | `InferValue<SchemaAtPath<S, P>>` |
| `TypedValueTree<S>` | A `ValueTree` with typed `root`, `get()`, `getValue()`, `setValue()` |
| `TypedRowModel<S>` | A `RowModel` with typed `get()`, `getValue()`, `setValue()`, `getPlainValue()` |
| `TypedTableModel<S>` | A `TableModel` with typed `rows`, `addRow()`, `getRow()` |
| `TypedPrimitiveValueNode<T>` | `PrimitiveValueNode` with narrowed `value: T` |
| `TypedObjectValueNode<P>` | `ObjectValueNode` with typed `child()` and `getPlainValue()` |
| `TypedArrayValueNode<I>` | `ArrayValueNode` with typed `at()` and `getPlainValue()` |

## Limitations

- Recursion depth ~8-10 levels (bails to `ValueNode` / `unknown` beyond that)
- `$ref` schemas fall back to untyped (`ValueNode`)
- Dynamic schemas loaded at runtime without type declarations use the untyped API
- Path autocomplete may be slow for very wide/deep schemas in IDEs
