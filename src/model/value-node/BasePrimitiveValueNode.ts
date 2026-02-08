import { makeObservable } from '../../core/reactivity/index.js';
import type { Diagnostic } from '../../core/validation/types.js';
import type { JsonSchema } from '../../types/schema.types.js';
import { BaseValueNode } from './BaseValueNode.js';
import type {
  FormulaDefinition,
  FormulaWarning,
  PrimitiveValueNode,
} from './types.js';
import { extractFormulaDefinition } from './types.js';

export abstract class BasePrimitiveValueNode<T extends string | number | boolean>
  extends BaseValueNode
  implements PrimitiveValueNode
{
  protected _value: T;
  protected _baseValue: T;
  protected _formulaWarning: FormulaWarning | null = null;

  constructor(
    id: string | undefined,
    name: string,
    schema: JsonSchema,
    value: T | undefined,
    defaultValue: T,
  ) {
    super(id, name, schema);
    const schemaDefault = 'default' in schema ? (schema.default as T) : undefined;
    const initialValue = value ?? schemaDefault ?? defaultValue;
    this._value = initialValue;
    this._baseValue = initialValue;
  }

  protected initObservable(): void {
    makeObservable(this, {
      _value: 'observable',
      _baseValue: 'observable',
      _formulaWarning: 'observable',
      value: 'computed',
      baseValue: 'computed',
      isDirty: 'computed',
      errors: 'computed',
      warnings: 'computed',
      setValue: 'action',
      setFormulaWarning: 'action',
      commit: 'action',
      revert: 'action',
    });
  }

  get value(): T {
    return this._value;
  }

  set value(newValue: T) {
    if (this.isReadOnly) {
      throw new Error(`Cannot set value on read-only field: ${this.name}`);
    }
    this._value = newValue;
  }

  get baseValue(): T {
    return this._baseValue;
  }

  get isDirty(): boolean {
    if (this.formula !== undefined) {
      return false;
    }
    return this._value !== this._baseValue;
  }

  abstract get defaultValue(): T;

  get formula(): FormulaDefinition | undefined {
    return extractFormulaDefinition(this.schema);
  }

  get formulaWarning(): FormulaWarning | null {
    return this._formulaWarning;
  }

  get isReadOnly(): boolean {
    const readOnly = 'readOnly' in this.schema ? this.schema.readOnly : false;
    return readOnly === true || this.formula !== undefined;
  }

  getPlainValue(): T {
    return this._value;
  }

  setValue(value: unknown, options?: { internal?: boolean }): void {
    if (this.isReadOnly && !options?.internal) {
      throw new Error(`Cannot set value on read-only field: ${this.name}`);
    }
    this._value = this.coerceValue(value);
  }

  protected abstract coerceValue(value: unknown): T;

  setFormulaWarning(warning: FormulaWarning | null): void {
    this._formulaWarning = warning;
  }

  commit(): void {
    this._baseValue = this._value;
  }

  revert(): void {
    this._value = this._baseValue;
  }

  override isPrimitive(): this is PrimitiveValueNode {
    return true;
  }

  override get errors(): readonly Diagnostic[] {
    return this.computeErrors();
  }

  protected computeErrors(): readonly Diagnostic[] {
    return [];
  }

  override get warnings(): readonly Diagnostic[] {
    if (!this._formulaWarning) {
      return [];
    }

    return [
      {
        severity: 'warning',
        type: this._formulaWarning.type,
        message: this._formulaWarning.message,
        path: this.name,
        params: {
          expression: this._formulaWarning.expression,
          computedValue: this._formulaWarning.computedValue,
        },
      },
    ];
  }
}
