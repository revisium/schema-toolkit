# Validation Module

Value validation engine with pluggable validators and rules.

## API

```typescript
interface ValidationContext {
  value: unknown;
  schema: SchemaLike;
  nodeName: string;
}

interface Diagnostic {
  severity: 'error' | 'warning';
  type: string;
  message: string;
  path: string;
  params?: Record<string, unknown>;
}

interface Validator {
  type: string;
  validate(context: ValidationContext): Diagnostic | null;
}

interface ValidatorRule {
  validatorType: string;
  shouldApply(context: ValidationContext): boolean;
}
```

## Built-in Validators

|Validator|Rule|Description|
|---|---|---|
|RequiredValidator|`required: true`|Empty/null/undefined check|
|PatternValidator|`pattern: string`|Regex pattern matching|
|MinLengthValidator|`minLength: number`|String min length|
|MaxLengthValidator|`maxLength: number`|String max length|
|MinimumValidator|`minimum: number`|Number min value|
|MaximumValidator|`maximum: number`|Number max value|
|EnumValidator|`enum: array`|Allowed values list|
|ForeignKeyValidator|`foreignKey: string`|FK reference required|

## Usage

```typescript
import { createValidationEngine } from '@revisium/schema-toolkit/core';

const engine = createValidationEngine();

const diagnostics = engine.validate({
  value: '',
  schema: { type: 'string', required: true, minLength: 3 },
  nodeName: 'username',
});
// [{ severity: 'error', type: 'required', message: 'Field is required', path: 'username' }]
```

## Custom Validators

```typescript
import { ValidatorRegistry, createValidationEngine } from '@revisium/schema-toolkit/core';

const registry = new ValidatorRegistry();

registry.register('custom', () => ({
  type: 'custom',
  validate: (ctx) => ctx.value === 'bad'
    ? { severity: 'error', type: 'custom', message: 'Bad value', path: ctx.nodeName }
    : null,
}));

registry.addRule({
  validatorType: 'custom',
  shouldApply: () => true,
});

const engine = createValidationEngine(registry);
```

## Architecture

```text
ValidatorRegistry    ← registers validators + rules
       ↓
ValidatorResolver    ← resolves which validators apply
       ↓
ValidationEngine     ← runs validators, collects diagnostics
```

---

# Schema Validation

Validation of schema structure itself (field names, duplicates, etc.).

## Schema Validation Types

```typescript
type SchemaValidationErrorType = 'empty-name' | 'duplicate-name' | 'invalid-name';

interface SchemaValidationError {
  nodeId: string;
  type: SchemaValidationErrorType;
  message: string;
}
```

## Field Name Validation

Field names must:
- Start with a letter or underscore
- NOT start with `__` (reserved for system)
- Only contain letters, numbers, hyphens, and underscores
- Be at most 64 characters

```typescript
import { isValidFieldName } from '@revisium/schema-toolkit/core';

isValidFieldName('myField');     // true
isValidFieldName('_private');    // true
isValidFieldName('123invalid');  // false
isValidFieldName('__reserved');  // false
```

## Schema Structure Validation

```typescript
import { validateSchema } from '@revisium/schema-toolkit/core';

const errors = validateSchema(schemaTree.root());
// Returns SchemaValidationError[] for:
// - empty-name: Field with empty name
// - duplicate-name: Same name used twice in object
// - invalid-name: Name violates pattern rules
```

---

# Formula Validation

Validation of formula dependencies in schema.

```typescript
interface FormulaValidationError {
  nodeId: string;
  message: string;
  fieldPath?: string;
}
```

## Usage

```typescript
import { validateFormulas } from '@revisium/schema-toolkit/core';

const errors = validateFormulas(schemaTree);
// Returns FormulaValidationError[] for formulas with missing dependencies
```

---

# Integration with SchemaModel

SchemaModel provides convenient methods for validation:

```typescript
import { createSchemaModel } from '@revisium/schema-toolkit';

const model = createSchemaModel(schema);

// Get schema validation errors
const schemaErrors = model.getValidationErrors();

// Get formula validation errors
const formulaErrors = model.getFormulaErrors();

// Check if schema is fully valid
const isValid = model.isValid();
// Returns true only if:
// - Root is object
// - No schema validation errors
// - No formula errors
```
