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
row.getPatches();               // JSON Patch operations
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

## API

### Schema Helpers

| Function | Description |
|----------|-------------|
| `str()` | Create string schema |
| `num()` | Create number schema |
| `bool()` | Create boolean schema |
| `obj(properties)` | Create object schema (generic — preserves property types) |
| `arr(items)` | Create array schema (generic — preserves items type) |
| `ref(tableName)` | Create $ref schema |

### Table & Row

| Function | Description |
|----------|-------------|
| `createRowModel(options)` | Create a row model (typed overload when schema is typed) |
| `createTableModel(options)` | Create a table model (typed overload when schema is typed) |

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
| `TypedRowModel<S>` | RowModel with typed `getValue`, `setValue`, `getPlainValue` |
| `TypedTableModel<S>` | TableModel with typed rows, `addRow`, `getRow` |

See [Typed API documentation](src/types/TYPED-API.md) for the full reference.

## License

MIT
