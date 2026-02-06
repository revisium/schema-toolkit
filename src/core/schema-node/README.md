# Schema Node Module

Immutable node wrappers for JSON Schema tree representation.

## API

```typescript
interface SchemaNode {
  id(): string;
  name(): string;
  nodeType(): NodeType;
  metadata(): NodeMetadata;

  isObject(): boolean;
  isArray(): boolean;
  isPrimitive(): boolean;
  isRef(): boolean;
  isNull(): boolean;

  property(name: string): SchemaNode;
  properties(): readonly SchemaNode[];
  items(): SchemaNode;

  ref(): string | undefined;
  formula(): Formula | undefined;
  hasFormula(): boolean;
  defaultValue(): unknown;
  foreignKey(): string | undefined;

  clone(): SchemaNode;
}

type NodeType = 'object' | 'array' | 'string' | 'number' | 'boolean' | 'ref' | 'null';
```

## Node Types

|Type|Factory|Description|
|---|---|---|
|ObjectNode|`createObjectNode(id, name, children?, options?)`|Container with named properties|
|ArrayNode|`createArrayNode(id, name, items, options?)`|Array with item schema|
|StringNode|`createStringNode(id, name, options?)`|String with default, foreignKey, formula|
|NumberNode|`createNumberNode(id, name, options?)`|Number with default, formula|
|BooleanNode|`createBooleanNode(id, name, options?)`|Boolean with default, formula|
|RefNode|`createRefNode(id, name, ref, metadata?)`|Unresolved schema reference ($ref)|
|NULL_NODE|singleton|Null object for safe chaining|

## Ref Support

Any node type can have a `$ref` marker. This is used when a `$ref` schema is resolved:

```typescript
// Resolved $ref to object schema
const file = createObjectNode('file-id', 'avatar', [
  createStringNode('url-id', 'url'),
], { ref: 'File' });

file.isObject();  // true
file.isRef();     // true (has $ref marker)
file.ref();       // 'File'

// Unresolved $ref (RefNode)
const unknown = createRefNode('ref-id', 'data', 'Unknown');
unknown.nodeType();  // 'ref'
unknown.isRef();     // true
unknown.ref();       // 'Unknown'
```

## Usage

```typescript
import {
  createObjectNode,
  createStringNode,
  createArrayNode,
  NULL_NODE,
} from '@revisium/schema-toolkit/core';

const user = createObjectNode('user-id', 'user', [
  createStringNode('name-id', 'name', { defaultValue: '' }),
  createStringNode('email-id', 'email', { foreignKey: 'emails' }),
  createArrayNode('tags-id', 'tags',
    createStringNode('tag-id', 'item', { defaultValue: '' })
  ),
]);

user.property('name').defaultValue();  // ''
user.property('tags').items().nodeType();  // 'string'
user.property('missing');  // NULL_NODE
```

## Formula Support

```typescript
const computed = createNumberNode('total-id', 'total', {
  formula: { version: 1, expression: 'price * quantity' },
});

computed.hasFormula();  // true
computed.formula();  // { version: 1, expression: 'price * quantity' }
```

## Cloning

All nodes support deep cloning for base/current state management:

```typescript
const base = user.clone();
// base is a deep copy, modifications to user don't affect base
```

## Null Object Pattern

`NULL_NODE` enables safe method chaining:

```typescript
user.property('missing').property('also-missing').items();  // NULL_NODE
NULL_NODE.isNull();  // true
```

## Reactivity Support

Nodes are automatically reactive when MobX is configured as the reactivity provider. Each node class calls `makeObservable` in its constructor.

```typescript
import * as mobx from 'mobx';
import { setReactivityProvider, createMobxProvider } from '@revisium/schema-toolkit/core';
import { createObjectNode, createStringNode } from '@revisium/schema-toolkit/core';

// Configure MobX provider (typically done once at app initialization)
setReactivityProvider(createMobxProvider(mobx));

// Nodes are automatically reactive
const root = createObjectNode('root', 'root', [
  createStringNode('c1', 'field1', { defaultValue: '' }),
  createStringNode('c2', 'field2', { defaultValue: '' }),
]);

// MobX reactions work automatically
mobx.autorun(() => {
  console.log('Name:', root.name());
});

root.setName('newName'); // Triggers autorun
```

### Node Annotations by Type

| Node Type | Observable Fields | Actions |
|-----------|------------------|---------|
| All nodes | `_name`, `_metadata` (ref) | `setName`, `setMetadata` |
| Primitive | + `_formula` (ref), `_defaultValue`, `_foreignKey` | + `setFormula`, `setDefaultValue`, `setForeignKey` |
| StringNode | + `_contentMediaType` | + `setContentMediaType` |
| ObjectNode | + `_children` (shallow) | + `addChild`, `insertChild`, `removeChild`, `replaceChild` |
| ArrayNode | + `_items` (ref) | + `setItems` |
