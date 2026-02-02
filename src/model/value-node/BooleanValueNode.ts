import type { ReactivityAdapter } from '../../core/reactivity/types.js';
import type { JsonSchema } from '../../types/schema.types.js';
import { BasePrimitiveValueNode } from './BasePrimitiveValueNode.js';
import { ValueType } from './types.js';

export class BooleanValueNode extends BasePrimitiveValueNode<boolean> {
  readonly type = ValueType.Boolean;

  constructor(
    id: string | undefined,
    name: string,
    schema: JsonSchema,
    value?: boolean,
    reactivity?: ReactivityAdapter,
  ) {
    super(id, name, schema, value, false, reactivity);
    this.initObservable();
  }

  get defaultValue(): boolean {
    return 'default' in this.schema ? (this.schema.default as boolean) : false;
  }

  protected coerceValue(value: unknown): boolean {
    if (typeof value === 'boolean') {
      return value;
    }
    return Boolean(value);
  }
}
