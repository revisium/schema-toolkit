# schema-serializer

Serializes `SchemaNode` trees into JSON Schema format.

## Responsibility

- Converts `SchemaNode` → `JsonSchema`
- Handles metadata (title, description, deprecated)
- Serializes formulas to `x-formula`
- Serializes foreign keys
- Handles `$ref` for RefNode
- Does NOT compare schemas (see `schema-diff`)

## API

```typescript
interface SerializeOptions {
  excludeNodeIds?: Set<string>;
}

class SchemaSerializer {
  serializeNode(
    node: SchemaNode,
    tree: SchemaTree,
    options?: SerializeOptions
  ): JsonSchema;

  serializeTree(tree: SchemaTree): JsonObjectSchema;
}
```

## Usage

### Basic Serialization

```typescript
import { SchemaSerializer } from '@revisium/schema-toolkit';
import { createSchemaTree, createObjectNode, createStringNode } from '@revisium/schema-toolkit';

const root = createObjectNode('root', 'root', [
  createStringNode('name-id', 'name', { defaultValue: 'John' }),
]);
const tree = createSchemaTree(root);

const serializer = new SchemaSerializer();
const jsonSchema = serializer.serializeTree(tree);

// Result:
// {
//   type: 'object',
//   properties: {
//     name: { type: 'string', default: 'John' }
//   },
//   additionalProperties: false,
//   required: ['name']
// }
```

### With Metadata

```typescript
const root = createObjectNode('root', 'root', [
  createStringNode('name-id', 'name', {
    defaultValue: '',
    metadata: {
      title: 'User Name',
      description: 'The full name of the user',
      deprecated: false,
    },
  }),
]);
const tree = createSchemaTree(root);

const result = serializer.serializeTree(tree);

// Result:
// {
//   type: 'object',
//   properties: {
//     name: {
//       type: 'string',
//       default: '',
//       title: 'User Name',
//       description: 'The full name of the user'
//     }
//   },
//   ...
// }
```

### With Formulas

```typescript
const root = createObjectNode('root', 'root', [
  createNumberNode('price-id', 'price', { defaultValue: 0 }),
  createNumberNode('qty-id', 'quantity', { defaultValue: 0 }),
  createNumberNode('total-id', 'total', {
    defaultValue: 0,
    formula: { version: 1, expression: 'price * quantity' },
  }),
]);
const tree = createSchemaTree(root);

const result = serializer.serializeTree(tree);

// Result includes:
// {
//   ...
//   properties: {
//     total: {
//       type: 'number',
//       default: 0,
//       readOnly: true,
//       'x-formula': {
//         version: 1,
//         expression: 'price * quantity'
//       }
//     }
//   }
// }
```

### With Foreign Keys

```typescript
const root = createObjectNode('root', 'root', [
  createStringNode('user-id', 'userId', {
    defaultValue: '',
    foreignKey: 'users',
  }),
]);
const tree = createSchemaTree(root);

const result = serializer.serializeTree(tree);

// Result:
// {
//   type: 'object',
//   properties: {
//     userId: {
//       type: 'string',
//       default: '',
//       foreignKey: 'users'
//     }
//   },
//   ...
// }
```

### Excluding Nodes

```typescript
const root = createObjectNode('root', 'root', [
  createStringNode('name-id', 'name', { defaultValue: '' }),
  createStringNode('secret-id', 'secret', { defaultValue: '' }),
]);
const tree = createSchemaTree(root);

const result = serializer.serializeNode(tree.root(), tree, {
  excludeNodeIds: new Set(['secret-id']),
});

// Result excludes 'secret' field:
// {
//   type: 'object',
//   properties: {
//     name: { type: 'string', default: '' }
//   },
//   additionalProperties: false,
//   required: ['name']
// }
```

### Arrays and Nested Objects

```typescript
const root = createObjectNode('root', 'root', [
  createArrayNode(
    'items-id',
    'items',
    createObjectNode('item-id', '[*]', [
      createStringNode('name-id', 'name', { defaultValue: '' }),
      createNumberNode('price-id', 'price', { defaultValue: 0 }),
    ]),
  ),
]);
const tree = createSchemaTree(root);

const result = serializer.serializeTree(tree);

// Result:
// {
//   type: 'object',
//   properties: {
//     items: {
//       type: 'array',
//       items: {
//         type: 'object',
//         properties: {
//           name: { type: 'string', default: '' },
//           price: { type: 'number', default: 0 }
//         },
//         additionalProperties: false,
//         required: ['name', 'price']
//       }
//     }
//   },
//   additionalProperties: false,
//   required: ['items']
// }
```

### Ref Fields

```typescript
const root = createObjectNode('root', 'root', [
  createRefNode('file-id', 'avatar', 'File'),
]);
const tree = createSchemaTree(root);

const result = serializer.serializeTree(tree);

// Result:
// {
//   type: 'object',
//   properties: {
//     avatar: { $ref: 'File' }
//   },
//   additionalProperties: false,
//   required: ['avatar']
// }
```

## Output Types

| Input Node | Output Schema |
|------------|---------------|
| ObjectNode | JsonObjectSchema |
| ArrayNode | JsonArraySchema |
| StringNode | JsonStringSchema |
| NumberNode | JsonNumberSchema |
| BooleanNode | JsonBooleanSchema |
| RefNode | JsonRefSchema |

## Dependencies

- `schema-node` - Input node types
- `schema-tree` - Tree structure for context
- `types` - JSON Schema output types
