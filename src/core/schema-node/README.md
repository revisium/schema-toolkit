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
|ObjectNode|`createObjectNode(id, name, children?, metadata?)`|Container with named properties|
|ArrayNode|`createArrayNode(id, name, items, metadata?)`|Array with item schema|
|StringNode|`createStringNode(id, name, options?)`|String with default, foreignKey, formula|
|NumberNode|`createNumberNode(id, name, options?)`|Number with default, formula|
|BooleanNode|`createBooleanNode(id, name, options?)`|Boolean with default, formula|
|RefNode|`createRefNode(id, name, ref, metadata?)`|Schema reference ($ref)|
|NULL_NODE|singleton|Null object for safe chaining|

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
