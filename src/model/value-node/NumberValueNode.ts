import type { ReactivityAdapter } from '../../core/reactivity/types.js';
import type { Diagnostic } from '../../core/validation/types.js';
import type { JsonSchema } from '../../types/schema.types.js';
import { JsonSchemaTypeName } from '../../types/schema.types.js';
import { BasePrimitiveValueNode } from './BasePrimitiveValueNode.js';
import { ValueType } from './types.js';

export class NumberValueNode extends BasePrimitiveValueNode<number> {
  readonly type = ValueType.Number;

  constructor(
    id: string | undefined,
    name: string,
    schema: JsonSchema,
    value?: number,
    reactivity?: ReactivityAdapter,
  ) {
    super(id, name, schema, value, 0, reactivity);
    this.initObservable();
  }

  get defaultValue(): number {
    return 'default' in this.schema ? (this.schema.default as number) : 0;
  }

  protected coerceValue(value: unknown): number {
    if (typeof value === 'number') {
      return value;
    }
    return Number(value) || 0;
  }

  protected override computeErrors(): readonly Diagnostic[] {
    const errors: Diagnostic[] = [];

    if (!('type' in this.schema) || this.schema.type !== JsonSchemaTypeName.Number) {
      return errors;
    }

    const numberSchema = this.schema;

    const minimum = numberSchema.minimum;
    if (minimum !== undefined && this._value < minimum) {
      errors.push({
        severity: 'error',
        type: 'min',
        message: `Value must be at least ${minimum}`,
        path: this.name,
        params: { min: minimum, actual: this._value },
      });
    }

    const maximum = numberSchema.maximum;
    if (maximum !== undefined && this._value > maximum) {
      errors.push({
        severity: 'error',
        type: 'max',
        message: `Value must be at most ${maximum}`,
        path: this.name,
        params: { max: maximum, actual: this._value },
      });
    }

    const enumValues = numberSchema.enum;
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

    return errors;
  }
}
