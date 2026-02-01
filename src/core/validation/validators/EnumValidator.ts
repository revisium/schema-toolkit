import type { Diagnostic, Validator, ValidationContext } from '../types.js';

export class EnumValidator implements Validator {
  readonly type = 'enum';

  validate(context: ValidationContext): Diagnostic | null {
    const { value, schema, nodeName } = context;
    const enumValues = schema.enum;

    if (!enumValues || enumValues.length === 0) {
      return null;
    }

    if (!enumValues.includes(value as string | number)) {
      return {
        severity: 'error',
        type: this.type,
        message: 'Value must be one of the allowed values',
        path: nodeName,
        params: { allowed: [...enumValues], actual: value },
      };
    }

    return null;
  }
}
