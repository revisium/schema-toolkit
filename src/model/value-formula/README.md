# value-formula

Runtime formula evaluation for value-node trees.

## Dependencies

### Internal

- `../value-node` - Value node tree implementation (`ValueNode`, `PrimitiveValueNode`, `ObjectValueNodeInterface`, `ArrayValueNodeInterface`)
- `../../core/reactivity` - Reactivity adapter interface (`ReactivityAdapter`)
- `../../types/schema.types` - JSON Schema types

### External

- `@revisium/formula` - Formula parsing and evaluation (`parseExpression`, `evaluateWithContext`)

## Overview

This module provides formula computation capabilities for value trees, enabling computed fields that automatically update based on their dependencies. It uses already-parsed formulas from the `@revisium/formula` library and evaluates them against value nodes.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  FormulaEngine                                                  │
│    - Orchestrates formula evaluation                            │
│    - Sets up reactive updates via ReactivityAdapter             │
│    - Manages formula lifecycle (init, reinitialize, dispose)    │
└────────┬────────────────────────────────────────────────────────┘
         │ uses
         ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ FormulaCollector│  │ DependencyGraph │  │ FormulaEvaluator│
│ - Traverse tree │  │ - Topological   │  │ - Evaluate AST  │
│ - Find formulas │  │   sort          │  │ - Build context │
│ - Resolve deps  │  │ - Find affected │  │ - Handle errors │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

## Components

### FormulaCollector

Traverses a value tree and collects all fields with `x-formula` schema extension.

```typescript
import { FormulaCollector } from './FormulaCollector';

const collector = new FormulaCollector();
const formulas = collector.collect(rootNode);
// Returns: FormulaField[] with node, expression, dependencies, arrayLevels
```

### DependencyGraph

Builds dependency relationships and computes evaluation order.

```typescript
import { DependencyGraph } from './DependencyGraph';

const graph = new DependencyGraph();
const depMap = graph.buildDependencyMap(formulas);
const order = graph.buildEvaluationOrder(formulas);
const affected = graph.getAffectedFormulas(changedNode, depMap, order);
```

### FormulaEvaluator

Evaluates individual formulas and updates node values.

```typescript
import { FormulaEvaluator } from './FormulaEvaluator';

const evaluator = new FormulaEvaluator(tree, {
  onError: (node, error) => console.error(error),
});
evaluator.evaluate(field);
evaluator.evaluateAll(fields);
```

### FormulaEngine

High-level orchestrator that manages the entire formula evaluation lifecycle.

```typescript
import { FormulaEngine } from './FormulaEngine';

const engine = new FormulaEngine(tree, options, reactivityAdapter);

// Formulas are evaluated automatically on initialization
console.log(tree.getPlainValue()); // Computed values included

// Re-evaluate all formulas
engine.reinitialize();

// Cleanup
engine.dispose();
```

## Types

### FormulaField

```typescript
interface FormulaField {
  readonly node: PrimitiveValueNode;
  readonly expression: string;
  readonly parent: ObjectValueNode | null;
  readonly dependencyNodes: readonly PrimitiveValueNode[];
  readonly arrayLevels: readonly FormulaArrayLevel[];
}
```

### FormulaArrayLevel

```typescript
interface FormulaArrayLevel {
  readonly array: ArrayValueNode;
  readonly index: number;
}
```

### ValueTreeRoot

```typescript
interface ValueTreeRoot {
  readonly root: ValueNode;
  getPlainValue(): unknown;
}
```

## Reactivity

When a `ReactivityAdapter` is provided, the engine sets up reactions to automatically re-evaluate affected formulas when dependencies change:

```typescript
import { FormulaEngine } from './FormulaEngine';

// With reactivity adapter (e.g., MobX)
const engine = new FormulaEngine(tree, {}, mobxAdapter);

// Changing a value will automatically trigger re-evaluation
priceNode.setValue(200); // total formula auto-updates
```

## Formula Expression Syntax

Formulas support:
- Field references: `price`, `item.quantity`
- Arithmetic: `price * quantity`, `a + b - c`
- Absolute paths: `/rootField` (from root)
- Relative paths: `../parentField` (from parent)
- Array context: `#index`, `#length`, `@prev`, `@next`
- Functions: `sum(items)`, `avg(values)`, `count(array)`

## Warnings

The evaluator tracks problematic results:
- `nan`: Formula result is NaN (e.g., 0/0)
- `infinity`: Formula result is Infinity (e.g., 1/0)
- `runtime-error`: Expression threw an error

```typescript
const node = tree.get('result');
if (node.isPrimitive() && node.formulaWarning) {
  console.log(node.formulaWarning.type); // 'nan' | 'infinity' | 'runtime-error'
  console.log(node.formulaWarning.message);
}
```
