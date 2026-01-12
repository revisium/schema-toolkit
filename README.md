<div align="center">

# @revisium/schema-toolkit

[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=revisium_schema-toolkit&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=revisium_schema-toolkit)
[![codecov](https://codecov.io/gh/revisium/schema-toolkit/graph/badge.svg?token=OLFXI79CN3)](https://codecov.io/gh/revisium/schema-toolkit)
[![GitHub License](https://img.shields.io/badge/License-MIT-green.svg)](https://github.com/revisium/schema-toolkit/blob/master/LICENSE)
[![GitHub Release](https://img.shields.io/github/v/release/revisium/schema-toolkit)](https://github.com/revisium/schema-toolkit/releases)

Framework-agnostic TypeScript types, system schemas, runtime stores, and utilities for working with JSON Schema in [Revisium](https://revisium.io) projects.

</div>

## Installation

```bash
npm install @revisium/schema-toolkit
```

## API

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

## License

MIT
