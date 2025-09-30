<div align="center">

# @revisium/schema-toolkit

[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=revisium_schema-toolkit&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=revisium_schema-toolkit)
[![codecov](https://codecov.io/gh/revisium/schema-toolkit/graph/badge.svg?token=OLFXI79CN3)](https://codecov.io/gh/revisium/schema-toolkit)
[![GitHub License](https://img.shields.io/badge/License-MIT-green.svg)](https://github.com/revisium/prisma-pg-json/blob/master/LICENSE)
[![GitHub Release](https://img.shields.io/github/v/release/revisium/schema-toolkit)](https://github.com/revisium/schema-toolkit/releases)

**Universal TypeScript toolkit for JSON Schema definitions used across the Revisium ecosystem.**

</div>

## Overview

`@revisium/schema-toolkit` provides framework-agnostic TypeScript types, system schemas, runtime stores, utilities, and testing helpers for working with JSON Schema in Revisium projects. This package contains shared code used by `revisium-core`, `revisium-endpoint`, and `revisium-admin`.

## Features

- 🎯 **TypeScript Types** - Complete type definitions for JSON Schema, JSON Patch, JSON Value Patch, and migrations
- 🔧 **System Schemas** - Pre-defined schemas for Revisium system fields (row ID, timestamps, file handling, etc.)
- 🏪 **Runtime Stores** - Schema and value store classes for runtime manipulation
- 🛠️ **Utilities** - 18+ utility functions for schema operations, patches, foreign keys, and more
- 🧪 **Test Utilities** - Helper functions for generating mock schemas in tests
- ✅ **Validation Schemas** - Ajv-compatible validation schemas (optional)
- 🌐 **Framework Agnostic** - No dependencies on backend/frontend frameworks (only `nanoid` for ID generation)
- 📦 **Tree-shakeable** - Use only what you need with ES modules

## Installation

```bash
npm install @revisium/schema-toolkit
```

## Usage

### TypeScript Types

```typescript
import {
  JsonSchema,
  JsonObjectSchema,
  JsonSchemaTypeName,
} from '@revisium/schema-toolkit/types';

const userSchema: JsonObjectSchema = {
  type: JsonSchemaTypeName.Object,
  properties: {
    name: { type: JsonSchemaTypeName.String, default: '' },
    age: { type: JsonSchemaTypeName.Number, default: 0 },
  },
};
```

### System Schemas

```typescript
import {
  rowIdSchema,
  rowCreatedAtSchema,
  fileSchema,
} from '@revisium/schema-toolkit/plugins';
```

### Model Stores

```typescript
import {
  createJsonSchemaStore,
  createJsonValueStore,
} from '@revisium/schema-toolkit/lib';

// Create schema store
const schemaStore = createJsonSchemaStore({
  type: 'object',
  properties: {
    name: { type: 'string', default: '' },
  },
});

// Create value store
const valueStore = createJsonValueStore(
  schemaStore,
  'row-id-123',
  { name: 'John' }
);
```

### Utilities

```typescript
import {
  applyPatches,
  getForeignKeysFromSchema,
  resolveRefs,
} from '@revisium/schema-toolkit/lib';

// Apply JSON patches to schema
const updatedSchema = applyPatches(schema, patches);

// Get foreign keys from schema
const foreignKeys = getForeignKeysFromSchema(schemaStore);

// Resolve $ref in schemas (endpoint feature)
const resolved = resolveRefs(schemaWithRefs);
```

### Test Utilities

```typescript
import {
  getStringSchema,
  getObjectSchema,
  getRefSchema,
} from '@revisium/schema-toolkit/mocks';

const mockSchema = getObjectSchema({
  name: getStringSchema(),
  userId: getStringSchema({ foreignKey: 'User' }),
  avatar: getRefSchema('File'),
});
```

## API Reference

### Entry Points

- `@revisium/schema-toolkit` - All exports (convenience)
- `@revisium/schema-toolkit/types` - TypeScript types only
- `@revisium/schema-toolkit/plugins` - System schemas
- `@revisium/schema-toolkit/mocks` - Test utilities
- `@revisium/schema-toolkit/consts` - Constants (CustomSchemeKeywords, SystemSchemaIds)
- `@revisium/schema-toolkit/model` - Schema and value stores
- `@revisium/schema-toolkit/lib` - Utility functions
- `@revisium/schema-toolkit/validation-schemas` - Ajv validation schemas

### Key Utilities

**Schema Operations:**
- `createJsonSchemaStore(schema)` - Create runtime schema store
- `getJsonSchemaStoreByPath(store, path)` - Navigate schema by JSON pointer
- `applyPatches(schema, patches)` - Apply JSON Patch operations

**Value Operations:**
- `createJsonValueStore(schema, rowId, data)` - Create runtime value store
- `getJsonValueStoreByPath(store, path)` - Navigate value by JSON pointer

**Foreign Keys:**
- `getForeignKeysFromSchema(store)` - Extract foreign keys from schema
- `getForeignKeysFromValue(store)` - Extract foreign key values from data
- `replaceForeignKeyValue(store, fromId, toId)` - Replace foreign key references

**Other:**
- `resolveRefs(schema)` - Resolve $ref to inline schemas
- `validateJsonFieldName(name)` - Validate field name format

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Run tests with coverage
npm run test:cov

# Lint
npm run lint:ci

# Format
npm run format

# Type check
npm run tsc
```

## License

MIT