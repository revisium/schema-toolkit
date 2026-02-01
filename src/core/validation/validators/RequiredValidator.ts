import type { Diagnostic, Validator, ValidationContext } from '../types.js';

export class RequiredValidator implements Validator {
  readonly type = 'required';

  validate(context: ValidationContext): Diagnostic | null {
    const { value, nodeName } = context;

    if (value === '' || value === null || value === undefined) {
      return {
        severity: 'error',
        type: this.type,
        message: 'Field is required',
        path: nodeName,
      };
    }

    return null;
  }
}
