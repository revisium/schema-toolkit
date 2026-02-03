# value-node

Reactive value tree implementation for JSON data with dirty tracking, validation, and formula support.

## Overview

The `value-node` module provides a tree-based representation of JSON values that:
- Maps to a JSON Schema structure
- Supports reactive updates via `ReactivityAdapter`
- Tracks dirty state (commit/revert)
- Validates data against schema constraints
- Supports formula fields (read-only computed values)

## Architecture

```text
┌─────────────────────────────────────────────────────────────────┐
│  ValueNode Hierarchy                                            │
│                                                                 │
│  ValueNode (interface)                                          │
│      │                                                          │
│      ├── BaseValueNode (abstract)                               │
│      │       │                                                  │
│      │       ├── BasePrimitiveValueNode<T>                      │
│      │       │       ├── StringValueNode                        │
│      │       │       │       └── ForeignKeyValueNodeImpl        │
│      │       │       ├── NumberValueNode                        │
│      │       │       └── BooleanValueNode                       │
│      │       │                                                  │
│      │       ├── ObjectValueNode                                │
│      │       │       └── children: Map<string, ValueNode>       │
│      │       │                                                  │
│      │       └── ArrayValueNode                                 │
│      │               └── items: ValueNode[]                     │
│      │                                                          │
│      └── DirtyTrackable (interface)                             │
│              └── isDirty, commit(), revert()                    │
└─────────────────────────────────────────────────────────────────┘
```

## API

### Types

```typescript
// Value node types
enum ValueType {
  String = 'string',
  Number = 'number',
  Boolean = 'boolean',
  Object = 'object',
  Array = 'array',
}

// Formula definition from schema
interface FormulaDefinition {
  readonly expression: string;
  readonly version: 1; // Currently only version 1 is supported
}

// Formula computation warning
interface FormulaWarning {
  readonly type: 'nan' | 'infinity' | 'type-coercion' | 'division-by-zero' | 'null-reference' | 'runtime-error';
  readonly message: string;
  readonly expression: string;
  readonly computedValue: unknown;
}
```

### ValueNode Interface

```typescript
interface ValueNode {
  readonly id: string;
  readonly type: ValueType;
  readonly schema: JsonSchema;

  parent: ValueNode | null;
  readonly name: string;

  readonly value: unknown;
  getPlainValue(): unknown;

  isObject(): this is ObjectValueNode;
  isArray(): this is ArrayValueNode;
  isPrimitive(): this is PrimitiveValueNode;

  readonly errors: readonly Diagnostic[];
  readonly warnings: readonly Diagnostic[];
  readonly isValid: boolean;
  readonly hasWarnings: boolean;
}
```

### PrimitiveValueNode

```typescript
interface PrimitiveValueNode extends ValueNode, DirtyTrackable {
  value: string | number | boolean;
  readonly baseValue: string | number | boolean;
  readonly defaultValue: unknown;
  readonly formula: FormulaDefinition | undefined;
  readonly formulaWarning: FormulaWarning | null;
  readonly isReadOnly: boolean;

  setValue(value: unknown, options?: { internal?: boolean }): void;
  setFormulaWarning(warning: FormulaWarning | null): void;
}
```

### ForeignKeyValueNode

```typescript
interface ForeignKeyValueNode extends ValueNode {
  readonly value: string;
  readonly foreignKey: string;

  getRow(): Promise<RowData>;
  getSchema(): Promise<JsonObjectSchema>;

  readonly isLoading: boolean;
}

// Type guard
function isForeignKeyValueNode(node: ValueNode): node is ForeignKeyValueNode;
```

### ObjectValueNode

```typescript
interface ObjectValueNode extends ValueNode, DirtyTrackable {
  readonly value: Record<string, ValueNode>;
  readonly children: readonly ValueNode[];

  child(name: string): ValueNode | undefined;
  addChild(node: ValueNode): void;
  removeChild(name: string): void;
  hasChild(name: string): boolean;
}
```

### ArrayValueNode

```typescript
interface ArrayValueNode extends ValueNode, DirtyTrackable {
  readonly value: readonly ValueNode[];
  readonly length: number;

  at(index: number): ValueNode | undefined;
  push(node: ValueNode): void;
  insertAt(index: number, node: ValueNode): void;
  removeAt(index: number): void;
  move(fromIndex: number, toIndex: number): void;
  replaceAt(index: number, node: ValueNode): void;
  clear(): void;

  setNodeFactory(factory: NodeFactory): void;
  pushValue(value?: unknown): void;
  insertValueAt(index: number, value?: unknown): void;
}
```

### NodeFactory

```typescript
function createNodeFactory(options?: NodeFactoryOptions): NodeFactory;

interface NodeFactoryOptions {
  refSchemas?: RefSchemas;          // For resolving $ref schemas
  reactivity?: ReactivityAdapter;   // For reactive updates
  fkResolver?: ForeignKeyResolver;  // For FK field resolution
}

class NodeFactory {
  create(name: string, schema: JsonSchema, value: unknown, id?: string): ValueNode;
  createTree(schema: JsonSchema, value: unknown): ValueNode;
}
```

## Usage

### Basic Usage

```typescript
import { createNodeFactory } from '@revisium/schema-toolkit/model/value-node';
import { JsonSchemaTypeName } from '@revisium/schema-toolkit/types';

const factory = createNodeFactory();

const schema = {
  type: JsonSchemaTypeName.Object,
  properties: {
    name: { type: JsonSchemaTypeName.String, default: '' },
    age: { type: JsonSchemaTypeName.Number, default: 0 },
  },
  additionalProperties: false,
  required: ['name', 'age'],
};

const data = { name: 'John', age: 25 };
const root = factory.createTree(schema, data);

// Access values
if (root.isObject()) {
  const nameNode = root.child('name');
  console.log(nameNode?.getPlainValue()); // 'John'
}
```

### With Reactivity (MobX)

```typescript
import { createNodeFactory } from '@revisium/schema-toolkit/model/value-node';
import { createMobxAdapter } from '@revisium/schema-toolkit/core/reactivity';

const reactivity = createMobxAdapter();
const factory = createNodeFactory({ reactivity });

const root = factory.createTree(schema, data);

// Changes trigger MobX reactions
if (root.isObject()) {
  const nameNode = root.child('name');
  if (nameNode?.isPrimitive()) {
    nameNode.setValue('Jane'); // Triggers reactive update
  }
}
```

### Dirty Tracking

```typescript
const root = factory.createTree(schema, data);

if (root.isObject()) {
  const nameNode = root.child('name');
  if (nameNode?.isPrimitive()) {
    console.log(nameNode.isDirty); // false

    nameNode.setValue('Jane');
    console.log(nameNode.isDirty); // true
    console.log(nameNode.baseValue); // 'John'
    console.log(nameNode.value); // 'Jane'

    nameNode.revert();
    console.log(nameNode.value); // 'John'
    console.log(nameNode.isDirty); // false

    nameNode.setValue('Jane');
    nameNode.commit();
    console.log(nameNode.baseValue); // 'Jane'
    console.log(nameNode.isDirty); // false
  }
}
```

### Validation

```typescript
const schema = {
  type: JsonSchemaTypeName.String,
  default: '',
  required: true,
  minLength: 3,
  maxLength: 50,
  pattern: '^[A-Za-z]+$',
};

const node = new StringValueNode(undefined, 'name', schema, '');

console.log(node.errors);
// [{ severity: 'error', type: 'required', message: 'Field is required', path: 'name' }]

node.setValue('ab');
console.log(node.errors);
// [{ severity: 'error', type: 'minLength', message: 'Minimum length is 3', path: 'name', params: { min: 3, actual: 2 } }]

node.setValue('John123');
console.log(node.errors);
// [{ severity: 'error', type: 'pattern', message: 'Value does not match pattern', path: 'name', params: { pattern: '^[A-Za-z]+$' } }]

node.setValue('John');
console.log(node.isValid); // true
console.log(node.errors); // []
```

### Formula Fields

```typescript
const schema = {
  type: JsonSchemaTypeName.String,
  default: '',
  readOnly: true,
  'x-formula': { version: 1, expression: 'firstName + " " + lastName' },
};

const node = new StringValueNode(undefined, 'fullName', schema);

console.log(node.isReadOnly); // true
console.log(node.formula); // { version: 1, expression: 'firstName + " " + lastName' }

// Cannot set value on formula field
node.setValue('Test'); // throws: Cannot set value on read-only field: fullName

// But internal setValue works (for formula engine)
node.setValue('John Doe', { internal: true }); // OK
```

### Array Operations

```typescript
const schema = {
  type: JsonSchemaTypeName.Array,
  items: { type: JsonSchemaTypeName.String, default: '' },
};

const root = factory.createTree(schema, ['a', 'b', 'c']);

if (root.isArray()) {
  // Access items
  console.log(root.length); // 3
  console.log(root.at(0)?.getPlainValue()); // 'a'
  console.log(root.at(-1)?.getPlainValue()); // 'c'

  // Add items
  root.pushValue('d');
  root.insertValueAt(0, 'z');

  // Remove items
  root.removeAt(1);

  // Move items
  root.move(0, 2);

  // Get plain value
  console.log(root.getPlainValue()); // ['b', 'c', 'z', 'd']
}
```

### Foreign Key Fields

```typescript
import { createNodeFactory, isForeignKeyValueNode } from '@revisium/schema-toolkit/model/value-node';
import { createForeignKeyResolver } from '@revisium/schema-toolkit/model/foreign-key-resolver';
import { JsonSchemaTypeName } from '@revisium/schema-toolkit/types';

// Create FK resolver with data
const fkResolver = createForeignKeyResolver();
fkResolver.addTable('categories', categorySchema, [
  { rowId: 'cat-1', data: { name: 'Electronics' } },
  { rowId: 'cat-2', data: { name: 'Books' } },
]);

// Create factory with FK resolver
const factory = createNodeFactory({ fkResolver });

const schema = {
  type: JsonSchemaTypeName.Object,
  properties: {
    name: { type: JsonSchemaTypeName.String, default: '' },
    categoryId: { type: JsonSchemaTypeName.String, default: '', foreignKey: 'categories' },
  },
  additionalProperties: false,
  required: ['name', 'categoryId'],
};

const root = factory.createTree(schema, { name: 'iPhone', categoryId: 'cat-1' });

if (root.isObject()) {
  const categoryNode = root.child('categoryId');

  // Check if it's a FK node
  if (categoryNode && isForeignKeyValueNode(categoryNode)) {
    console.log(categoryNode.foreignKey); // 'categories'
    console.log(categoryNode.value);      // 'cat-1'

    // Resolve the referenced row
    const row = await categoryNode.getRow();
    console.log(row.data); // { name: 'Electronics' }

    // Get the target table schema
    const targetSchema = await categoryNode.getSchema();

    // Check loading state
    console.log(categoryNode.isLoading); // false (already cached)
  }
}
```

## Dependencies

### Internal
- `../../core/reactivity/types.js` - ReactivityAdapter interface
- `../../core/validation/types.js` - Diagnostic type
- `../../types/schema.types.js` - JSON Schema types

### External
None (framework-agnostic)

## Testing

```bash
npm test -- src/model/value-node
```

## Related Modules

- `schema-model` - Schema tree operations
- `schema-formula` - Formula parsing and serialization (for `x-formula` support)
- `value-formula` (PR 2.9) - Runtime formula evaluation for value trees
- `foreign-key-resolver` - FK caching and resolution for ForeignKeyValueNode
- `data-model` - Multi-table container with integrated FK resolver
