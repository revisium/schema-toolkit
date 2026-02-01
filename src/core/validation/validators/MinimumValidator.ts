import type { Diagnostic, Validator, ValidationContext } from '../types.js';

export class MinimumValidator implements Validator {
  readonly type = 'minimum';

  validate(context: ValidationContext): Diagnostic | null {
    const { value, schema, nodeName } = context;
    const minimum = schema.minimum;

    if (minimum === undefined) {
      return null;
    }

    if (typeof value !== 'number') {
      return null;
    }

    if (value < minimum) {
      return {
        severity: 'error',
        type: this.type,
        message: `Value must be at least ${minimum}`,
        path: nodeName,
        params: { min: minimum, actual: value },
      };
    }

    return null;
  }
}
