# schema-formula

Formula system for schema-model with parsing, dependency tracking, and serialization.

## Architecture

```
schema-formula/
├── core/                         # Interfaces and types
│   ├── Formula.ts                # Formula interface (AST + dependencies)
│   ├── FormulaDependency.ts      # Dependency on another node
│   └── FormulaError.ts           # Formula validation errors
├── parsing/
│   ├── ParsedFormula.ts          # Parse expression → AST, resolve dependencies
│   └── FormulaPath.ts            # Convert formula path syntax → Path
├── serialization/
│   ├── FormulaSerializer.ts      # Serialize formula with current paths
│   └── FormulaPathBuilder.ts     # Convert Path → formula path syntax
├── store/
│   └── FormulaDependencyIndex.ts # Track dependencies (who depends on whom)
├── changes/
│   └── FormulaChangeDetector.ts  # Detect indirect formula changes
└── index.ts
```

## Key Concepts

### Parse Once, Use Everywhere

Formulas are parsed ONCE when schema is loaded. The parsed formula is stored in SchemaNode and reused:

```
┌──────────────────────────────────────────────────────────┐
│  schema-formula                                           │
│  ┌─────────────────┐                                      │
│  │ ParsedFormula   │  ← parses expression → AST + deps    │
│  └────────┬────────┘                                      │
│           │                                               │
│           ▼                                               │
│  ┌─────────────────┐                                      │
│  │ SchemaNode      │  ← stores ParsedFormula reference    │
│  │   .formula      │                                      │
│  └────────┬────────┘                                      │
└───────────┼──────────────────────────────────────────────┘
            │
            ▼
┌───────────┼──────────────────────────────────────────────┐
│  value-formula (future)                                   │
│  ┌─────────────────┐                                      │
│  │ FormulaEngine   │  ← NO re-parsing, uses parsed AST    │
│  │   .evaluate()   │  ← evaluates with current values     │
│  └─────────────────┘                                      │
└──────────────────────────────────────────────────────────┘
```

### Formula Interface

```typescript
interface Formula {
  version(): number;
  ast(): ASTNode;
  dependencies(): readonly FormulaDependency[];
  getNodeIdForAstPath(astPath: string): string | null;
  astPaths(): readonly string[];
}
```

### FormulaDependency

Represents a dependency from one formula to another field:

```typescript
interface FormulaDependency {
  readonly nodeId: string;      // Target node ID
  readonly astPath: string;     // Path in AST (for updates)
}
```

## Usage

### Creating a Formula

```typescript
import { ParsedFormula } from '@revisium/schema-toolkit';

// Parse formula expression with tree context
const formula = new ParsedFormula(tree, nodeId, 'price * quantity');

// Access AST and dependencies
console.log(formula.ast());          // { type: 'BinaryExpression', ... }
console.log(formula.dependencies()); // [{ nodeId: 'price-id', astPath: '$.left' }, ...]
```

### Serializing a Formula

```typescript
import { FormulaSerializer } from '@revisium/schema-toolkit';

// Serialize formula back to x-formula format
const xFormula = FormulaSerializer.toXFormula(tree, nodeId, formula);
// { version: 1, expression: 'price * quantity' }
```

### Tracking Dependencies

```typescript
import { FormulaDependencyIndex } from '@revisium/schema-toolkit';

const index = new FormulaDependencyIndex();

// Register formula
index.registerFormula(totalNodeId, formula);

// Get all nodes that depend on a field
const dependents = index.getDependents(priceNodeId);
// ['total-node-id']

// Get formula for a node
const totalFormula = index.getFormula(totalNodeId);
```

### Detecting Indirect Changes

When a field is renamed, formulas referencing it need updates:

```typescript
import { FormulaChangeDetector } from '@revisium/schema-toolkit';

const detector = new FormulaChangeDetector(index, tree, baseTree);

// After renaming 'price' → 'cost'
const indirectChanges = detector.detectIndirectChanges(renamedNodeIds);
// Returns nodes whose formulas need re-serialization
```

## Integration with SchemaModel

SchemaModel uses schema-formula internally:

```typescript
const model = createSchemaModel({
  type: 'object',
  properties: {
    price: { type: 'number', default: 0 },
    quantity: { type: 'number', default: 0 },
    total: {
      type: 'number',
      default: 0,
      readOnly: true,
      'x-formula': { version: 1, expression: 'price * quantity' }
    }
  }
});

// Rename price → cost
model.renameField(priceId, 'cost');

// getPatches() includes indirect formula change:
// 1. move patch for price → cost
// 2. replace patch for total (formula changed to 'cost * quantity')
const patches = model.getPatches();
```

## Supported Expression Syntax

- **Identifiers**: `price`, `quantity`
- **Binary operations**: `+`, `-`, `*`, `/`
- **Comparisons**: `==`, `!=`, `<`, `>`, `<=`, `>=`
- **Logical**: `&&`, `||`, `!`
- **Ternary**: `condition ? then : else`
- **Member access**: `item.price`, `data.nested.value`
- **Array access**: `items[0]`, `items[*]` (wildcard)
- **Functions**: `sum(items[*].price)`, `avg(values)`

## Dependencies

### External
- `@revisium/formula` - Formula parser, AST types, and utilities (`parseFormula`, `serializeAst`, `replaceDependencies`)

### Internal (from schema-toolkit)
- `core/path` - Path abstraction for JSON Pointer manipulation
- `core/schema-tree` - SchemaTree interface for navigating nodes
- `core/schema-node` - SchemaNode interface and Formula type
