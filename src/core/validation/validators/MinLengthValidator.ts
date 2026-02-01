import type { Diagnostic, Validator, ValidationContext } from '../types.js';

export class MinLengthValidator implements Validator {
  readonly type = 'minLength';

  validate(context: ValidationContext): Diagnostic | null {
    const { value, schema, nodeName } = context;
    const minLength = schema.minLength;

    if (minLength === undefined) {
      return null;
    }

    if (typeof value !== 'string') {
      return null;
    }

    if (value.length === 0) {
      return null;
    }

    if (value.length < minLength) {
      return {
        severity: 'error',
        type: this.type,
        message: `Value must be at least ${minLength} characters`,
        path: nodeName,
        params: { min: minLength, actual: value.length },
      };
    }

    return null;
  }
}
