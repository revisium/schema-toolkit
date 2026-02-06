# type-transformer

Pluggable type transformation system for schema field type changes.

## Dependencies

```
core/schema-node  ← SchemaNode, createArrayNode, createRefNode, etc.
model/schema-model ← RefSchemas, SchemaParser
mocks/schema.mocks ← obj, ref (for schema construction)
nanoid            ← ID generation
```

## API

```typescript
type FieldTypeSpec = SimpleFieldType | FieldSchemaSpec;

type SimpleFieldType = 'string' | 'number' | 'boolean' | 'object' | 'array';

interface FieldSchemaSpec {
  type?: SimpleFieldType;
  $ref?: string;
  default?: unknown;
  title?: string;
  description?: string;
  deprecated?: boolean;
  foreignKey?: string;
  'x-formula'?: { expression: string };
}

interface TypeTransformer {
  canTransform(ctx: TransformContext): boolean;
  transform(ctx: TransformContext): TransformResult;
}

interface TransformContext {
  sourceNode: SchemaNode;
  targetSpec: FieldSchemaSpec;
  refSchemas?: RefSchemas;
}

interface TransformResult {
  node: SchemaNode;
}
```

## Usage

### Basic usage

```typescript
import { createTypeTransformChain } from './type-transformer';

const chain = createTypeTransformChain();

// Simple type change
const result = chain.transform(stringNode, 'number');

// With spec object
const result = chain.transform(stringNode, {
  type: 'number',
  default: 0,
  title: 'Price',
});

// $ref transformation
const result = chain.transform(stringNode, {
  $ref: 'urn:jsonschema:io:revisium:file-schema:1.0.0',
});
```

### With refSchemas

```typescript
const chain = createTypeTransformChain({
  refSchemas: {
    'urn:custom:schema': {
      type: 'object',
      properties: { id: { type: 'string', default: '' } },
      additionalProperties: false,
      required: ['id'],
    },
  },
});

// Creates resolved object node with isRef() === true
const result = chain.transform(stringNode, { $ref: 'urn:custom:schema' });
```

### Custom transformers

```typescript
import { TypeTransformer, TransformContext, TransformResult } from './type-transformer';

class MyCustomTransformer implements TypeTransformer {
  canTransform(ctx: TransformContext): boolean {
    // Return true if this transformer should handle the transformation
    return ctx.sourceNode.nodeType() === 'string' && ctx.targetSpec.type === 'number';
  }

  transform(ctx: TransformContext): TransformResult {
    // Create and return transformed node
    return { node: createNumberNode(nanoid(), ctx.sourceNode.name(), { defaultValue: 0 }) };
  }
}

const chain = createTypeTransformChain({
  customTransformers: [new MyCustomTransformer()],
});
```

## Built-in Transformers

| Transformer | Source | Target | Behavior |
|-------------|--------|--------|----------|
| `PrimitiveToArrayTransformer` | primitive | array | Wraps primitive in array (string → array\<string\>) |
| `ObjectToArrayTransformer` | object | array | Wraps object in array (object → array\<object\>) |
| `ArrayToItemsTypeTransformer` | array | primitive | Extracts items if types match (array\<string\> → string) |
| `RefTransformer` | any | $ref | Creates ref node, resolves if refSchemas provided |
| `DefaultTransformer` | any | type | Creates new node with default values (fallback) |

## Transformer Priority

Transformers are evaluated in order:
1. Custom transformers (first match wins)
2. `PrimitiveToArrayTransformer`
3. `ObjectToArrayTransformer`
4. `ArrayToItemsTypeTransformer`
5. `RefTransformer`
6. `DefaultTransformer` (fallback)

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    TypeTransformChain                       │
│                                                             │
│  transform(sourceNode, spec) → TransformResult              │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Transformer Pipeline                    │   │
│  │                                                      │   │
│  │  [Custom] → [Primitive→Array] → [Object→Array] →     │   │
│  │  [Array→Items] → [Ref] → [Default]                   │   │
│  │                                                      │   │
│  │  First transformer where canTransform() === true     │   │
│  │  handles the transformation                          │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```
