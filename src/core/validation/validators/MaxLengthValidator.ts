import type { Diagnostic, Validator, ValidationContext } from '../types.js';

export class MaxLengthValidator implements Validator {
  readonly type = 'maxLength';

  validate(context: ValidationContext): Diagnostic | null {
    const { value, schema, nodeName } = context;
    const maxLength = schema.maxLength;

    if (maxLength === undefined) {
      return null;
    }

    if (typeof value !== 'string') {
      return null;
    }

    if (value.length > maxLength) {
      return {
        severity: 'error',
        type: this.type,
        message: `Value must be at most ${maxLength} characters`,
        path: nodeName,
        params: { max: maxLength, actual: value.length },
      };
    }

    return null;
  }
}
