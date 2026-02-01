import { describe, it, expect } from '@jest/globals';
import {
  RequiredValidator,
  PatternValidator,
  MinLengthValidator,
  MaxLengthValidator,
  MinimumValidator,
  MaximumValidator,
  EnumValidator,
  ForeignKeyValidator,
} from '../validators';
import type { ValidationContext } from '../types';

describe('RequiredValidator', () => {
  const validator = new RequiredValidator();

  it('returns error for empty string', () => {
    const context: ValidationContext = {
      value: '',
      schema: { type: 'string', required: true },
      nodeName: 'name',
    };

    const diagnostic = validator.validate(context);
    expect(diagnostic).not.toBeNull();
    expect(diagnostic?.type).toBe('required');
  });

  it('returns error for null', () => {
    const context: ValidationContext = {
      value: null,
      schema: { type: 'string', required: true },
      nodeName: 'name',
    };

    const diagnostic = validator.validate(context);
    expect(diagnostic).not.toBeNull();
  });

  it('returns error for undefined', () => {
    const context: ValidationContext = {
      value: undefined,
      schema: { type: 'string', required: true },
      nodeName: 'name',
    };

    const diagnostic = validator.validate(context);
    expect(diagnostic).not.toBeNull();
  });

  it('returns null for non-empty value', () => {
    const context: ValidationContext = {
      value: 'John',
      schema: { type: 'string', required: true },
      nodeName: 'name',
    };

    const diagnostic = validator.validate(context);
    expect(diagnostic).toBeNull();
  });

  it('returns null for zero', () => {
    const context: ValidationContext = {
      value: 0,
      schema: { type: 'number', required: true },
      nodeName: 'count',
    };

    const diagnostic = validator.validate(context);
    expect(diagnostic).toBeNull();
  });

  it('returns null for false', () => {
    const context: ValidationContext = {
      value: false,
      schema: { type: 'boolean', required: true },
      nodeName: 'active',
    };

    const diagnostic = validator.validate(context);
    expect(diagnostic).toBeNull();
  });
});

describe('PatternValidator', () => {
  const validator = new PatternValidator();

  it('returns null for non-string value', () => {
    const context: ValidationContext = {
      value: 123,
      schema: { type: 'number', pattern: '^[0-9]+$' },
      nodeName: 'code',
    };

    const diagnostic = validator.validate(context);
    expect(diagnostic).toBeNull();
  });

  it('returns error when value does not match pattern', () => {
    const context: ValidationContext = {
      value: 'invalid',
      schema: { type: 'string', pattern: '^[0-9]+$' },
      nodeName: 'code',
    };

    const diagnostic = validator.validate(context);
    expect(diagnostic).not.toBeNull();
    expect(diagnostic?.type).toBe('pattern');
    expect(diagnostic?.params?.pattern).toBe('^[0-9]+$');
  });

  it('returns null when value matches pattern', () => {
    const context: ValidationContext = {
      value: '12345',
      schema: { type: 'string', pattern: '^[0-9]+$' },
      nodeName: 'code',
    };

    const diagnostic = validator.validate(context);
    expect(diagnostic).toBeNull();
  });

  it('returns null for empty string', () => {
    const context: ValidationContext = {
      value: '',
      schema: { type: 'string', pattern: '^[0-9]+$' },
      nodeName: 'code',
    };

    const diagnostic = validator.validate(context);
    expect(diagnostic).toBeNull();
  });

  it('returns null when no pattern in schema', () => {
    const context: ValidationContext = {
      value: 'anything',
      schema: { type: 'string' },
      nodeName: 'name',
    };

    const diagnostic = validator.validate(context);
    expect(diagnostic).toBeNull();
  });

  it('returns error for invalid regex pattern', () => {
    const context: ValidationContext = {
      value: 'test',
      schema: { type: 'string', pattern: '[' },
      nodeName: 'name',
    };

    const diagnostic = validator.validate(context);
    expect(diagnostic).not.toBeNull();
    expect(diagnostic?.type).toBe('invalidPattern');
  });
});

describe('MinLengthValidator', () => {
  const validator = new MinLengthValidator();

  it('returns null for non-string value', () => {
    const context: ValidationContext = {
      value: 123,
      schema: { type: 'number', minLength: 3 },
      nodeName: 'count',
    };

    const diagnostic = validator.validate(context);
    expect(diagnostic).toBeNull();
  });

  it('returns error when value is too short', () => {
    const context: ValidationContext = {
      value: 'ab',
      schema: { type: 'string', minLength: 3 },
      nodeName: 'name',
    };

    const diagnostic = validator.validate(context);
    expect(diagnostic).not.toBeNull();
    expect(diagnostic?.type).toBe('minLength');
    expect(diagnostic?.params?.min).toBe(3);
    expect(diagnostic?.params?.actual).toBe(2);
  });

  it('returns null when value meets minLength', () => {
    const context: ValidationContext = {
      value: 'abc',
      schema: { type: 'string', minLength: 3 },
      nodeName: 'name',
    };

    const diagnostic = validator.validate(context);
    expect(diagnostic).toBeNull();
  });

  it('returns error for empty string when minLength > 0', () => {
    const context: ValidationContext = {
      value: '',
      schema: { type: 'string', minLength: 3 },
      nodeName: 'name',
    };

    const diagnostic = validator.validate(context);
    expect(diagnostic).not.toBeNull();
    expect(diagnostic?.type).toBe('minLength');
    expect(diagnostic?.params?.min).toBe(3);
    expect(diagnostic?.params?.actual).toBe(0);
  });

  it('returns null when no minLength in schema', () => {
    const context: ValidationContext = {
      value: 'a',
      schema: { type: 'string' },
      nodeName: 'name',
    };

    const diagnostic = validator.validate(context);
    expect(diagnostic).toBeNull();
  });
});

describe('MaxLengthValidator', () => {
  const validator = new MaxLengthValidator();

  it('returns null for non-string value', () => {
    const context: ValidationContext = {
      value: 123456,
      schema: { type: 'number', maxLength: 5 },
      nodeName: 'count',
    };

    const diagnostic = validator.validate(context);
    expect(diagnostic).toBeNull();
  });

  it('returns error when value exceeds maxLength', () => {
    const context: ValidationContext = {
      value: 'abcdef',
      schema: { type: 'string', maxLength: 5 },
      nodeName: 'name',
    };

    const diagnostic = validator.validate(context);
    expect(diagnostic).not.toBeNull();
    expect(diagnostic?.type).toBe('maxLength');
    expect(diagnostic?.params?.max).toBe(5);
    expect(diagnostic?.params?.actual).toBe(6);
  });

  it('returns null when value meets maxLength', () => {
    const context: ValidationContext = {
      value: 'abcde',
      schema: { type: 'string', maxLength: 5 },
      nodeName: 'name',
    };

    const diagnostic = validator.validate(context);
    expect(diagnostic).toBeNull();
  });

  it('returns null when no maxLength in schema', () => {
    const context: ValidationContext = {
      value: 'very long string',
      schema: { type: 'string' },
      nodeName: 'name',
    };

    const diagnostic = validator.validate(context);
    expect(diagnostic).toBeNull();
  });
});

describe('MinimumValidator', () => {
  const validator = new MinimumValidator();

  it('returns error when value below minimum', () => {
    const context: ValidationContext = {
      value: 5,
      schema: { type: 'number', minimum: 10 },
      nodeName: 'age',
    };

    const diagnostic = validator.validate(context);
    expect(diagnostic).not.toBeNull();
    expect(diagnostic?.type).toBe('minimum');
    expect(diagnostic?.params?.min).toBe(10);
    expect(diagnostic?.params?.actual).toBe(5);
  });

  it('returns null when value equals minimum', () => {
    const context: ValidationContext = {
      value: 10,
      schema: { type: 'number', minimum: 10 },
      nodeName: 'age',
    };

    const diagnostic = validator.validate(context);
    expect(diagnostic).toBeNull();
  });

  it('returns null when value above minimum', () => {
    const context: ValidationContext = {
      value: 15,
      schema: { type: 'number', minimum: 10 },
      nodeName: 'age',
    };

    const diagnostic = validator.validate(context);
    expect(diagnostic).toBeNull();
  });

  it('returns null when no minimum in schema', () => {
    const context: ValidationContext = {
      value: -100,
      schema: { type: 'number' },
      nodeName: 'age',
    };

    const diagnostic = validator.validate(context);
    expect(diagnostic).toBeNull();
  });

  it('returns null for non-number value', () => {
    const context: ValidationContext = {
      value: 'not a number',
      schema: { type: 'number', minimum: 10 },
      nodeName: 'age',
    };

    const diagnostic = validator.validate(context);
    expect(diagnostic).toBeNull();
  });
});

describe('MaximumValidator', () => {
  const validator = new MaximumValidator();

  it('returns error when value above maximum', () => {
    const context: ValidationContext = {
      value: 150,
      schema: { type: 'number', maximum: 100 },
      nodeName: 'percentage',
    };

    const diagnostic = validator.validate(context);
    expect(diagnostic).not.toBeNull();
    expect(diagnostic?.type).toBe('maximum');
    expect(diagnostic?.params?.max).toBe(100);
    expect(diagnostic?.params?.actual).toBe(150);
  });

  it('returns null when value equals maximum', () => {
    const context: ValidationContext = {
      value: 100,
      schema: { type: 'number', maximum: 100 },
      nodeName: 'percentage',
    };

    const diagnostic = validator.validate(context);
    expect(diagnostic).toBeNull();
  });

  it('returns null when value below maximum', () => {
    const context: ValidationContext = {
      value: 50,
      schema: { type: 'number', maximum: 100 },
      nodeName: 'percentage',
    };

    const diagnostic = validator.validate(context);
    expect(diagnostic).toBeNull();
  });

  it('returns null when no maximum in schema', () => {
    const context: ValidationContext = {
      value: 1000000,
      schema: { type: 'number' },
      nodeName: 'count',
    };

    const diagnostic = validator.validate(context);
    expect(diagnostic).toBeNull();
  });

  it('returns null for non-number value', () => {
    const context: ValidationContext = {
      value: 'not a number',
      schema: { type: 'number', maximum: 100 },
      nodeName: 'count',
    };

    const diagnostic = validator.validate(context);
    expect(diagnostic).toBeNull();
  });
});

describe('EnumValidator', () => {
  const validator = new EnumValidator();

  it('returns error when value not in enum', () => {
    const context: ValidationContext = {
      value: 'invalid',
      schema: { type: 'string', enum: ['a', 'b', 'c'] },
      nodeName: 'status',
    };

    const diagnostic = validator.validate(context);
    expect(diagnostic).not.toBeNull();
    expect(diagnostic?.type).toBe('enum');
    expect(diagnostic?.params?.allowed).toEqual(['a', 'b', 'c']);
    expect(diagnostic?.params?.actual).toBe('invalid');
  });

  it('returns null when value in enum', () => {
    const context: ValidationContext = {
      value: 'b',
      schema: { type: 'string', enum: ['a', 'b', 'c'] },
      nodeName: 'status',
    };

    const diagnostic = validator.validate(context);
    expect(diagnostic).toBeNull();
  });

  it('works with numbers', () => {
    const context: ValidationContext = {
      value: 2,
      schema: { type: 'number', enum: [1, 2, 3] },
      nodeName: 'priority',
    };

    const diagnostic = validator.validate(context);
    expect(diagnostic).toBeNull();
  });

  it('returns null when no enum in schema', () => {
    const context: ValidationContext = {
      value: 'anything',
      schema: { type: 'string' },
      nodeName: 'name',
    };

    const diagnostic = validator.validate(context);
    expect(diagnostic).toBeNull();
  });
});

describe('ForeignKeyValidator', () => {
  const validator = new ForeignKeyValidator();

  it('returns error when foreignKey is empty', () => {
    const context: ValidationContext = {
      value: '',
      schema: { type: 'string', foreignKey: 'users' },
      nodeName: 'userId',
    };

    const diagnostic = validator.validate(context);
    expect(diagnostic).not.toBeNull();
    expect(diagnostic?.type).toBe('foreignKey');
    expect(diagnostic?.params?.table).toBe('users');
  });

  it('returns null when foreignKey has value', () => {
    const context: ValidationContext = {
      value: 'user-123',
      schema: { type: 'string', foreignKey: 'users' },
      nodeName: 'userId',
    };

    const diagnostic = validator.validate(context);
    expect(diagnostic).toBeNull();
  });

  it('returns null when no foreignKey in schema', () => {
    const context: ValidationContext = {
      value: '',
      schema: { type: 'string' },
      nodeName: 'name',
    };

    const diagnostic = validator.validate(context);
    expect(diagnostic).toBeNull();
  });
});
