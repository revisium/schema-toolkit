<div align="center">

# @revisium/schema-toolkit

[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=revisium_schema-toolkit&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=revisium_schema-toolkit)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=revisium_schema-toolkit&metric=coverage)](https://sonarcloud.io/summary/new_code?id=revisium_schema-toolkit)
[![GitHub License](https://img.shields.io/badge/License-MIT-green.svg)](https://github.com/revisium/schema-toolkit/blob/master/LICENSE)
[![GitHub Release](https://img.shields.io/github/v/release/revisium/schema-toolkit)](https://github.com/revisium/schema-toolkit/releases)

Framework-agnostic TypeScript types, system schemas, runtime stores, and utilities for working with JSON Schema in [Revisium](https://revisium.io) projects.

</div>

## Installation

```bash
npm install @revisium/schema-toolkit
```

## Quick Start

### Schema helpers

```typescript
import { obj, str, num, bool, arr } from '@revisium/schema-toolkit';

const schema = obj({
  name: str(),
  age: num(),
  active: bool(),
  tags: arr(str()),
});
```

### RowModel

```typescript
import { obj, str, num, createRowModel } from '@revisium/schema-toolkit';

const schema = obj({ name: str(), price: num() });

const row = createRowModel({
  rowId: 'row-1',
  schema,
  data: { name: 'Widget', price: 9.99 },
});

row.getValue('name');           // string (typed!)
row.setValue('price', 19.99);   // OK
row.setValue('price', 'wrong'); // TS Error!
row.getPlainValue();            // { name: string, price: number }
row.patches;                    // JSON Patch operations
row.root;                       // typed root node (ObjectValueNode)
row.reset({ name: 'New', price: 0 }); // reset to new data, commit
row.reset();                    // reset to schema defaults
```

### Array Search

Arrays expose `find` and `findIndex` for searching elements by node properties:

```typescript
import { obj, str, arr, createRowModel } from '@revisium/schema-toolkit';

const schema = obj({
  sorts: arr(obj({ field: str(), direction: str() })),
});

const row = createRowModel({
  rowId: 'row-1',
  schema,
  data: { sorts: [
    { field: 'name', direction: 'asc' },
    { field: 'age', direction: 'desc' },
  ]},
});

const sortsNode = row.get('sorts');
// find returns the typed node
const ageSort = sortsNode.find(
  (node) => node.child('field').getPlainValue() === 'age',
);
// findIndex returns the index
const idx = sortsNode.findIndex(
  (node) => node.child('field').getPlainValue() === 'age',
); // 1
```

### TableModel

```typescript
import { obj, str, num, bool, createTableModel } from '@revisium/schema-toolkit';

const schema = obj({ title: str(), price: num(), inStock: bool() });

const table = createTableModel({
  tableId: 'products',
  schema,
  rows: [
    { rowId: 'p1', data: { title: 'Laptop', price: 999, inStock: true } },
  ],
});

const row = table.getRow('p1');
row?.getValue('title');         // string (typed!)
row?.getPlainValue();           // { title: string, price: number, inStock: boolean }

const newRow = table.addRow('p2', { title: 'Mouse', price: 29, inStock: true });
newRow.setValue('price', 39);   // OK
newRow.setValue('price', 'x');  // TS Error!
```

### Typed API without helpers

When the schema is typed (via helpers or `as const`), `createRowModel` / `createTableModel` return typed models automatically. With plain `JsonSchema` they return the untyped API as before:

```typescript
import { createRowModel } from '@revisium/schema-toolkit';
import type { JsonObjectSchema } from '@revisium/schema-toolkit';

// Untyped — returns plain RowModel with unknown types
const schema: JsonObjectSchema = getSchemaFromApi();
const row = createRowModel({ rowId: 'row-1', schema, data });
row.getValue('name'); // unknown
```

See [Typed API documentation](src/types/TYPED-API.md) for all approaches: `as const`, explicit type declarations, `SchemaFromValue<T>`, and more.

## Reactivity (MobX)

By default all models use a noop reactivity provider, which works for backend and plain scripts. To enable MobX reactivity (e.g. in a React app), configure the provider once at startup:

```typescript
import * as mobx from 'mobx';
import { setReactivityProvider, createMobxProvider } from '@revisium/schema-toolkit/core';

setReactivityProvider(createMobxProvider(mobx));
```

After this call every model created via `createRowModel`, `createTableModel`, or `createDataModel` becomes fully observable.

See [Reactivity Module docs](src/core/reactivity/README.md) for the full API, noop behaviour table, and test-setup examples.

## Formulas (Computed Fields)

Fields with `x-formula` are automatically computed from other fields. Use `readOnly: true` and the `formula` option in helpers:

```typescript
import { obj, num, numFormula, createRowModel } from '@revisium/schema-toolkit';

const schema = obj({
  price: num(),
  quantity: num(),
  subtotal: numFormula('price * quantity'),
  tax: numFormula('subtotal * 0.1'),
  total: numFormula('subtotal + tax'),
});

const row = createRowModel({
  rowId: 'order-1',
  schema,
  data: { price: 100, quantity: 5, subtotal: 0, tax: 0, total: 0 },
});

row.getPlainValue();
// { price: 100, quantity: 5, subtotal: 500, tax: 50, total: 550 }
```

Formulas are evaluated in dependency order. With the MobX reactivity provider configured, changing a dependency triggers automatic re-evaluation of all affected formulas.

### Expression Syntax

| Syntax | Example |
|--------|---------|
| Field reference | `price`, `item.quantity` |
| Arithmetic | `price * quantity`, `a + b - c` |
| Comparison & logic | `a > b && c < d`, `x ? y : z` |
| Absolute path | `/rootField` |
| Relative path | `../siblingField` |
| Array access | `items[0].price`, `items[*].price` |
| Array context | `#index`, `#length`, `@prev`, `@next` |
| Functions | `sum(items[*].price)`, `avg(values)`, `count(array)` |

### Schema-Level Integration

When fields are renamed or moved, formula expressions are automatically updated in the generated patches:

```typescript
// rename price → cost
// formula 'price * quantity' → 'cost * quantity' (auto-updated)
```

### Warnings

The evaluator tracks problematic results (`nan`, `infinity`, `runtime-error`) on the node's `formulaWarning` property.

See [value-formula docs](src/model/value-formula/README.md) for the runtime engine API and [schema-formula docs](src/model/schema-formula/README.md) for parsing, dependency tracking, and serialization.

## Foreign Key Resolution

Schemas with `foreignKey` fields (string fields referencing another table) can be resolved automatically via `ForeignKeyResolver`:

```typescript
import { createForeignKeyResolver, createTableModel, obj, str } from '@revisium/schema-toolkit';

const resolver = createForeignKeyResolver({
  loader: {
    loadSchema: async (tableId) => api.getTableSchema(tableId),
    loadRow: async (tableId, rowId) => api.getRow(tableId, rowId),
  },
  prefetch: true,
});

const table = createTableModel({
  tableId: 'products',
  schema: obj({ name: str(), categoryId: str({ foreignKey: 'categories' }) }),
  rows: [{ rowId: 'p1', data: { name: 'Laptop', categoryId: 'cat-1' } }],
  fkResolver: resolver,
});

// Referenced data is prefetched in the background and available from cache
const category = await resolver.getRowData('categories', 'cat-1');
```

The same `fkResolver` option is accepted by `createRowModel`. When using `createDataModel`, pass the resolver once and all tables will share it.

See [ForeignKeyResolver docs](src/model/foreign-key-resolver/README.md) for cache-only mode, prefetch control, loading state, and error handling.

## API

### Schema Helpers

| Function | Description |
|----------|-------------|
| `str()` | Create string schema |
| `num()` | Create number schema |
| `bool()` | Create boolean schema |
| `strFormula(expr)` | Create computed string field (`readOnly: true` + `x-formula`) |
| `numFormula(expr)` | Create computed number field (`readOnly: true` + `x-formula`) |
| `boolFormula(expr)` | Create computed boolean field (`readOnly: true` + `x-formula`) |
| `obj(properties)` | Create object schema (generic — preserves property types) |
| `arr(items)` | Create array schema (generic — preserves items type) |
| `ref(tableName)` | Create $ref schema |

### Table & Row

| Function | Description |
|----------|-------------|
| `createRowModel(options)` | Create a row model (typed overload when schema is typed) |
| `createTableModel(options)` | Create a table model (typed overload when schema is typed) |

#### RowModel

| Property / Method | Description |
|-------------------|-------------|
| `root` | Typed root node (`InferNode<S>` for typed, `ValueNode` for untyped) |
| `get(path)` | Get node at path |
| `getValue(path)` | Get plain value at path |
| `setValue(path, value)` | Set value at path |
| `getPlainValue()` | Get full plain value |
| `reset(data?)` | Reset to given data (or schema defaults) and commit |
| `commit()` | Commit current state as base |
| `revert()` | Revert to last committed state |

#### ArrayValueNode

| Method | Description |
|--------|-------------|
| `at(index)` | Get element at index (supports negative) |
| `find(predicate)` | Find first element matching predicate |
| `findIndex(predicate)` | Find index of first element matching predicate |
| `push(node)` | Append element |
| `pushValue(value?)` | Create and append element from value |
| `removeAt(index)` | Remove element at index |
| `move(from, to)` | Move element between positions |
| `clear()` | Remove all elements |

### Value Tree

| Function | Description |
|----------|-------------|
| `createTypedTree(schema, data)` | Create a typed value tree with path-based access |
| `typedNode(node)` | Cast an untyped `ValueNode` to a typed node |

### Schema

| Function | Description |
|----------|-------------|
| `createJsonSchemaStore` | Create runtime schema store |
| `getJsonSchemaStoreByPath` | Navigate schema by path |
| `applyPatches` | Apply JSON Patch operations to schema |
| `resolveRefs` | Resolve $ref to inline schemas |
| `validateJsonFieldName` | Validate field name format |
| `getInvalidFieldNamesInSchema` | Find invalid field names in schema |

### Value

| Function | Description |
|----------|-------------|
| `createJsonValueStore` | Create runtime value store |
| `getJsonValueByPath` | Navigate value by path |
| `computeValueDiff` | Compute field-level diff between two values |
| `traverseValue` | Traverse value tree |

### Foreign Keys

| Function | Description |
|----------|-------------|
| `getForeignKeysFromSchema` | Extract foreign keys from schema |
| `getForeignKeysFromValue` | Extract foreign key values from data |
| `getForeignKeyPatchesFromSchema` | Get patches for foreign key changes |
| `replaceForeignKeyValue` | Replace foreign key references |

### Path Utils

| Function | Description |
|----------|-------------|
| `parsePath` | Parse dot-notation path to segments |
| `getParentForPath` | Get parent path |
| `getPathByStore` | Get path from store |
| `deepEqual` | Deep equality comparison |

### Type Utilities

| Type | Description |
|------|-------------|
| `InferValue<S>` | Schema → plain TypeScript value type |
| `InferNode<S>` | Schema → typed ValueNode interface |
| `SchemaFromValue<T>` | Plain TS type → virtual schema shape |
| `SchemaPaths<S>` | Union of all valid dot-separated paths |
| `TypedRowModel<S>` | RowModel with typed `root`, `getValue`, `setValue`, `getPlainValue`, `reset` |
| `TypedTableModel<S>` | TableModel with typed rows, `addRow`, `getRow` |

See [Typed API documentation](src/types/TYPED-API.md) for the full reference.

## License

MIT
