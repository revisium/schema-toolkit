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

## Reactivity Support

Nodes can be made reactive for use with MobX. Use the `makeNodeReactive` or `makeTreeNodesReactive` helpers:

```typescript
import {
  createObjectNode,
  createStringNode,
  makeNodeReactive,
  makeTreeNodesReactive,
} from '@revisium/schema-toolkit/core';
import { mobxAdapter } from '@revisium/schema-toolkit-ui';

// Make a single node reactive
const node = createStringNode('id', 'name', { defaultValue: '' });
makeNodeReactive(node, mobxAdapter);

// Make entire tree reactive (recursive)
const root = createObjectNode('root', 'root', [
  createStringNode('c1', 'field1', { defaultValue: '' }),
  createStringNode('c2', 'field2', { defaultValue: '' }),
]);
makeTreeNodesReactive(root, mobxAdapter);
```

### Node Annotations by Type

| Node Type | Observable Fields | Actions |
|-----------|------------------|---------|
| All nodes | `_name`, `_metadata` (ref) | `setName`, `setMetadata` |
| Primitive | + `_formula` (ref), `_defaultValue`, `_foreignKey` | + `setFormula`, `setDefaultValue`, `setForeignKey` |
| StringNode | + `_contentMediaType` | + `setContentMediaType` |
| ObjectNode | + `_children` (shallow) | + `addChild`, `removeChild`, `replaceChild` |
| ArrayNode | + `_items` (ref) | + `setItems` |

When using `SchemaModel` with reactivity, all nodes are automatically made reactive.
