import type { ReactivityAdapter } from '../../core/reactivity/types.js';
import type { Diagnostic } from '../../core/validation/types.js';
import type { JsonSchema, JsonStringSchema } from '../../types/schema.types.js';
import { BasePrimitiveValueNode } from './BasePrimitiveValueNode.js';
import { ValueType } from './types.js';

export class StringValueNode extends BasePrimitiveValueNode<string> {
  readonly type = ValueType.String;

  constructor(
    id: string | undefined,
    name: string,
    schema: JsonSchema,
    value?: string,
    reactivity?: ReactivityAdapter,
  ) {
    super(id, name, schema, value, '', reactivity);
    this.initObservable();
  }

  get defaultValue(): string {
    return 'default' in this.schema ? (this.schema.default as string) : '';
  }

  protected coerceValue(value: unknown): string {
    if (typeof value === 'string') {
      return value;
    }
    if (value === null || value === undefined) {
      return '';
    }
    return String(value);
  }

  protected override computeErrors(): readonly Diagnostic[] {
    const errors: Diagnostic[] = [];

    this.validateRequired(errors);
    this.validateForeignKey(errors);
    this.validateMinLength(errors);
    this.validateMaxLength(errors);
    this.validatePattern(errors);
    this.validateEnum(errors);

    return errors;
  }

  private validateRequired(errors: Diagnostic[]): void {
    const stringSchema = this.schema as JsonStringSchema;
    if ('required' in stringSchema && stringSchema.required && this._value === '') {
      errors.push({
        severity: 'error',
        type: 'required',
        message: 'Field is required',
        path: this.name,
      });
    }
  }

  private validateForeignKey(errors: Diagnostic[]): void {
    const stringSchema = this.schema as JsonStringSchema;
    const foreignKey = stringSchema.foreignKey;
    if (foreignKey && this._value === '') {
      errors.push({
        severity: 'error',
        type: 'foreignKey',
        message: `Reference to ${foreignKey} is required`,
        path: this.name,
        params: { table: foreignKey },
      });
    }
  }

  private validateMinLength(errors: Diagnostic[]): void {
    const stringSchema = this.schema as Partial<{ minLength?: number }>;
    const minLength = stringSchema.minLength;
    if (
      minLength !== undefined &&
      this._value.length > 0 &&
      this._value.length < minLength
    ) {
      errors.push({
        severity: 'error',
        type: 'minLength',
        message: `Minimum length is ${minLength}`,
        path: this.name,
        params: { min: minLength, actual: this._value.length },
      });
    }
  }

  private validateMaxLength(errors: Diagnostic[]): void {
    const stringSchema = this.schema as Partial<{ maxLength?: number }>;
    const maxLength = stringSchema.maxLength;
    if (maxLength !== undefined && this._value.length > maxLength) {
      errors.push({
        severity: 'error',
        type: 'maxLength',
        message: `Maximum length is ${maxLength}`,
        path: this.name,
        params: { max: maxLength, actual: this._value.length },
      });
    }
  }

  private validatePattern(errors: Diagnostic[]): void {
    const stringSchema = this.schema as JsonStringSchema;
    const pattern = stringSchema.pattern;
    if (!pattern || this._value.length === 0) {
      return;
    }

    try {
      if (!new RegExp(pattern).test(this._value)) {
        errors.push({
          severity: 'error',
          type: 'pattern',
          message: 'Value does not match pattern',
          path: this.name,
          params: { pattern },
        });
      }
    } catch {
      errors.push({
        severity: 'error',
        type: 'invalidPattern',
        message: 'Invalid regex pattern in schema',
        path: this.name,
        params: { pattern },
      });
    }
  }

  private validateEnum(errors: Diagnostic[]): void {
    const stringSchema = this.schema as JsonStringSchema;
    const enumValues = stringSchema.enum;
    if (
      enumValues &&
      enumValues.length > 0 &&
      !enumValues.includes(this._value)
    ) {
      errors.push({
        severity: 'error',
        type: 'enum',
        message: 'Value is not in allowed list',
        path: this.name,
        params: { allowed: enumValues, actual: this._value },
      });
    }
  }
}
