import { ValidatorRegistry } from './ValidatorRegistry.js';
import { ValidatorResolver } from './ValidatorResolver.js';
import { ValidationEngine } from './ValidationEngine.js';
import { SchemaPropertyRule, SchemaTruthyRule } from './rules/index.js';
import {
  RequiredValidator,
  PatternValidator,
  MinLengthValidator,
  MaxLengthValidator,
  MinimumValidator,
  MaximumValidator,
  EnumValidator,
  ForeignKeyValidator,
} from './validators/index.js';

export function createDefaultValidatorRegistry(): ValidatorRegistry {
  const registry = new ValidatorRegistry();

  registry
    .register('required', () => new RequiredValidator())
    .register('pattern', () => new PatternValidator())
    .register('minLength', () => new MinLengthValidator())
    .register('maxLength', () => new MaxLengthValidator())
    .register('minimum', () => new MinimumValidator())
    .register('maximum', () => new MaximumValidator())
    .register('enum', () => new EnumValidator())
    .register('foreignKey', () => new ForeignKeyValidator());

  registry
    .addRule(new SchemaTruthyRule('required', 'required'))
    .addRule(new SchemaPropertyRule('pattern', 'pattern'))
    .addRule(new SchemaPropertyRule('minLength', 'minLength'))
    .addRule(new SchemaPropertyRule('maxLength', 'maxLength'))
    .addRule(new SchemaPropertyRule('minimum', 'minimum'))
    .addRule(new SchemaPropertyRule('maximum', 'maximum'))
    .addRule(new SchemaPropertyRule('enum', 'enum'))
    .addRule(new SchemaPropertyRule('foreignKey', 'foreignKey'));

  return registry;
}

export function createValidationEngine(
  registry?: ValidatorRegistry,
): ValidationEngine {
  const validatorRegistry = registry ?? createDefaultValidatorRegistry();
  const resolver = new ValidatorResolver(validatorRegistry);
  return new ValidationEngine(resolver);
}
