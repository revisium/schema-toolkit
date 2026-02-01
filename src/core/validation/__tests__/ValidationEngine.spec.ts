import { describe, it, expect } from '@jest/globals';
import {
  ValidatorRegistry,
  ValidatorResolver,
  ValidationEngine,
  createValidationEngine,
  createDefaultValidatorRegistry,
} from '../index';
import {
  RequiredValidator,
  MinLengthValidator,
} from '../validators';
import { SchemaTruthyRule, SchemaPropertyRule, CompositeRule } from '../rules';
import type { ValidationContext } from '../types';

describe('ValidatorRegistry', () => {
  it('registers and retrieves validator', () => {
    const registry = new ValidatorRegistry();
    const factory = () => new RequiredValidator();

    registry.register('required', factory);

    const validator = registry.get('required');
    expect(validator).toBeInstanceOf(RequiredValidator);
  });

  it('returns undefined for unknown validator', () => {
    const registry = new ValidatorRegistry();
    expect(registry.get('unknown')).toBeUndefined();
  });

  it('supports chaining', () => {
    const registry = new ValidatorRegistry();

    const result = registry
      .register('a', () => new RequiredValidator())
      .register('b', () => new MinLengthValidator());

    expect(result).toBe(registry);
  });

  it('has returns true for registered type', () => {
    const registry = new ValidatorRegistry();
    registry.register('required', () => new RequiredValidator());

    expect(registry.has('required')).toBe(true);
    expect(registry.has('unknown')).toBe(false);
  });

  it('adds and retrieves rules', () => {
    const registry = new ValidatorRegistry();
    const rule = new SchemaTruthyRule('required', 'required');

    registry.addRule(rule);

    expect(registry.getRules()).toContain(rule);
  });

  it('lists validator types', () => {
    const registry = new ValidatorRegistry();
    registry.register('required', () => new RequiredValidator());
    registry.register('minLength', () => new MinLengthValidator());

    const types = registry.getValidatorTypes();
    expect(types).toContain('required');
    expect(types).toContain('minLength');
  });
});

describe('ValidatorResolver', () => {
  it('resolves validators based on rules', () => {
    const registry = new ValidatorRegistry();
    registry.register('required', () => new RequiredValidator());
    registry.addRule(new SchemaTruthyRule('required', 'required'));

    const resolver = new ValidatorResolver(registry);
    const context: ValidationContext = {
      value: '',
      schema: { type: 'string', required: true },
      nodeName: 'name',
    };

    const validators = resolver.resolve(context);
    expect(validators).toHaveLength(1);
    expect(validators[0]).toBeInstanceOf(RequiredValidator);
  });

  it('returns empty array when no rules match', () => {
    const registry = new ValidatorRegistry();
    registry.register('required', () => new RequiredValidator());
    registry.addRule(new SchemaTruthyRule('required', 'required'));

    const resolver = new ValidatorResolver(registry);
    const context: ValidationContext = {
      value: 'test',
      schema: { type: 'string' },
      nodeName: 'name',
    };

    const validators = resolver.resolve(context);
    expect(validators).toHaveLength(0);
  });

  it('resolves multiple validators when multiple rules match', () => {
    const registry = new ValidatorRegistry();
    registry.register('required', () => new RequiredValidator());
    registry.register('minLength', () => new MinLengthValidator());
    registry.addRule(new SchemaTruthyRule('required', 'required'));
    registry.addRule(new SchemaPropertyRule('minLength', 'minLength'));

    const resolver = new ValidatorResolver(registry);
    const context: ValidationContext = {
      value: '',
      schema: { type: 'string', required: true, minLength: 3 },
      nodeName: 'name',
    };

    const validators = resolver.resolve(context);
    expect(validators).toHaveLength(2);
  });
});

describe('ValidationEngine', () => {
  it('runs validators and collects diagnostics', () => {
    const registry = new ValidatorRegistry();
    registry.register('required', () => new RequiredValidator());
    registry.addRule(new SchemaTruthyRule('required', 'required'));

    const resolver = new ValidatorResolver(registry);
    const engine = new ValidationEngine(resolver);

    const context: ValidationContext = {
      value: '',
      schema: { type: 'string', required: true },
      nodeName: 'name',
    };

    const diagnostics = engine.validate(context);
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]?.type).toBe('required');
  });

  it('returns empty array when validation passes', () => {
    const registry = new ValidatorRegistry();
    registry.register('required', () => new RequiredValidator());
    registry.addRule(new SchemaTruthyRule('required', 'required'));

    const resolver = new ValidatorResolver(registry);
    const engine = new ValidationEngine(resolver);

    const context: ValidationContext = {
      value: 'John',
      schema: { type: 'string', required: true },
      nodeName: 'name',
    };

    const diagnostics = engine.validate(context);
    expect(diagnostics).toHaveLength(0);
  });
});

describe('createDefaultValidatorRegistry', () => {
  it('registers all built-in validators', () => {
    const registry = createDefaultValidatorRegistry();

    expect(registry.has('required')).toBe(true);
    expect(registry.has('foreignKey')).toBe(true);
    expect(registry.has('minLength')).toBe(true);
    expect(registry.has('maxLength')).toBe(true);
    expect(registry.has('pattern')).toBe(true);
    expect(registry.has('enum')).toBe(true);
    expect(registry.has('minimum')).toBe(true);
    expect(registry.has('maximum')).toBe(true);
  });

  it('has rules for all validators', () => {
    const registry = createDefaultValidatorRegistry();
    const rules = registry.getRules();

    expect(rules.length).toBeGreaterThan(0);
  });
});

describe('createValidationEngine', () => {
  it('creates engine with default registry', () => {
    const engine = createValidationEngine();

    const context: ValidationContext = {
      value: '',
      schema: { type: 'string', required: true },
      nodeName: 'name',
    };

    const diagnostics = engine.validate(context);
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]?.type).toBe('required');
  });

  it('accepts custom registry', () => {
    const registry = new ValidatorRegistry();
    registry.register('custom', () => ({
      type: 'custom',
      validate: () => ({
        severity: 'error',
        type: 'custom',
        message: 'Custom error',
        path: '',
      }),
    }));
    registry.addRule({
      validatorType: 'custom',
      shouldApply: () => true,
    });

    const engine = createValidationEngine(registry);

    const context: ValidationContext = {
      value: 'test',
      schema: { type: 'string' },
      nodeName: 'field',
    };

    const diagnostics = engine.validate(context);
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]?.type).toBe('custom');
  });
});

describe('Rules', () => {
  describe('SchemaPropertyRule', () => {
    it('applies when property exists', () => {
      const rule = new SchemaPropertyRule('minLength', 'minLength');
      const context: ValidationContext = {
        value: 'test',
        schema: { type: 'string', minLength: 3 },
        nodeName: 'name',
      };

      expect(rule.shouldApply(context)).toBe(true);
    });

    it('does not apply when property is undefined', () => {
      const rule = new SchemaPropertyRule('minLength', 'minLength');
      const context: ValidationContext = {
        value: 'test',
        schema: { type: 'string' },
        nodeName: 'name',
      };

      expect(rule.shouldApply(context)).toBe(false);
    });
  });

  describe('SchemaTruthyRule', () => {
    it('applies when property is true', () => {
      const rule = new SchemaTruthyRule('required', 'required');
      const context: ValidationContext = {
        value: '',
        schema: { type: 'string', required: true },
        nodeName: 'name',
      };

      expect(rule.shouldApply(context)).toBe(true);
    });

    it('does not apply when property is false', () => {
      const rule = new SchemaTruthyRule('required', 'required');
      const context: ValidationContext = {
        value: '',
        schema: { type: 'string', required: false },
        nodeName: 'name',
      };

      expect(rule.shouldApply(context)).toBe(false);
    });

    it('does not apply when property is undefined', () => {
      const rule = new SchemaTruthyRule('required', 'required');
      const context: ValidationContext = {
        value: '',
        schema: { type: 'string' },
        nodeName: 'name',
      };

      expect(rule.shouldApply(context)).toBe(false);
    });
  });

  describe('CompositeRule', () => {
    it('applies when all conditions match', () => {
      const rule = new CompositeRule('minLength', [
        (ctx) => ctx.schema.type === 'string',
        (ctx) => ctx.schema.minLength !== undefined,
      ]);
      const context: ValidationContext = {
        value: 'test',
        schema: { type: 'string', minLength: 3 },
        nodeName: 'name',
      };

      expect(rule.shouldApply(context)).toBe(true);
    });

    it('does not apply when any condition fails', () => {
      const rule = new CompositeRule('minLength', [
        (ctx) => ctx.schema.type === 'string',
        (ctx) => ctx.schema.minLength !== undefined,
      ]);
      const context: ValidationContext = {
        value: 123,
        schema: { type: 'number', minLength: 3 },
        nodeName: 'count',
      };

      expect(rule.shouldApply(context)).toBe(false);
    });
  });
});

describe('Integration tests', () => {
  it('validates pattern', () => {
    const engine = createValidationEngine();

    const context: ValidationContext = {
      value: 'invalid',
      schema: { type: 'string', pattern: '^[0-9]+$' },
      nodeName: 'code',
    };

    const diagnostics = engine.validate(context);
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]?.type).toBe('pattern');
  });

  it('validates string with multiple constraints', () => {
    const engine = createValidationEngine();

    const context: ValidationContext = {
      value: 'ab',
      schema: { type: 'string', required: true, minLength: 3, maxLength: 10 },
      nodeName: 'username',
    };

    const diagnostics = engine.validate(context);
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]?.type).toBe('minLength');
  });

  it('returns multiple errors when multiple validations fail', () => {
    const engine = createValidationEngine();

    const context: ValidationContext = {
      value: '',
      schema: { type: 'string', required: true, foreignKey: 'users' },
      nodeName: 'userId',
    };

    const diagnostics = engine.validate(context);
    expect(diagnostics.length).toBeGreaterThanOrEqual(2);
    expect(diagnostics.map((d) => d.type)).toContain('required');
    expect(diagnostics.map((d) => d.type)).toContain('foreignKey');
  });

  it('validates number with min/max', () => {
    const engine = createValidationEngine();

    const context: ValidationContext = {
      value: 150,
      schema: { type: 'number', minimum: 0, maximum: 100 },
      nodeName: 'percentage',
    };

    const diagnostics = engine.validate(context);
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]?.type).toBe('maximum');
  });

  it('validates enum for both string and number', () => {
    const engine = createValidationEngine();

    const stringContext: ValidationContext = {
      value: 'invalid',
      schema: { type: 'string', enum: ['active', 'inactive'] },
      nodeName: 'status',
    };

    const numberContext: ValidationContext = {
      value: 5,
      schema: { type: 'number', enum: [1, 2, 3] },
      nodeName: 'priority',
    };

    expect(engine.validate(stringContext)).toHaveLength(1);
    expect(engine.validate(numberContext)).toHaveLength(1);
  });
});
