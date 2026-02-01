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
