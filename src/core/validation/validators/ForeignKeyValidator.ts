import type { Diagnostic, Validator, ValidationContext } from '../types.js';

export class ForeignKeyValidator implements Validator {
  readonly type = 'foreignKey';

  validate(context: ValidationContext): Diagnostic | null {
    const { value, schema, nodeName } = context;
    const foreignKey = schema.foreignKey;

    if (!foreignKey) {
      return null;
    }

    if (value === '' || value === null || value === undefined) {
      return {
        severity: 'error',
        type: this.type,
        message: 'Foreign key reference is required',
        path: nodeName,
        params: { table: foreignKey },
      };
    }

    return null;
  }
}
