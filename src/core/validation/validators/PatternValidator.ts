import type { Diagnostic, Validator, ValidationContext } from '../types.js';

export class PatternValidator implements Validator {
  readonly type = 'pattern';

  validate(context: ValidationContext): Diagnostic | null {
    const { value, schema, nodeName } = context;
    const pattern = schema.pattern;

    if (!pattern) {
      return null;
    }

    if (typeof value !== 'string') {
      return null;
    }

    if (value.length === 0) {
      return null;
    }

    try {
      if (!new RegExp(pattern).test(value)) {
        return {
          severity: 'error',
          type: this.type,
          message: 'Value does not match pattern',
          path: nodeName,
          params: { pattern },
        };
      }
    } catch {
      return {
        severity: 'error',
        type: 'invalidPattern',
        message: 'Invalid regex pattern in schema',
        path: nodeName,
        params: { pattern },
      };
    }

    return null;
  }
}
