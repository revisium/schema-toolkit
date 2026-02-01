import type { Diagnostic, Validator, ValidationContext } from '../types.js';

export class MaximumValidator implements Validator {
  readonly type = 'maximum';

  validate(context: ValidationContext): Diagnostic | null {
    const { value, schema, nodeName } = context;
    const maximum = schema.maximum;

    if (maximum === undefined) {
      return null;
    }

    if (typeof value !== 'number') {
      return null;
    }

    if (value > maximum) {
      return {
        severity: 'error',
        type: this.type,
        message: `Value must be at most ${maximum}`,
        path: nodeName,
        params: { max: maximum, actual: value },
      };
    }

    return null;
  }
}
