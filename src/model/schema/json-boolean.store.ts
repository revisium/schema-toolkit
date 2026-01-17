import { nanoid } from 'nanoid';
import { EventEmitter } from 'node:events';
import {
  JsonBooleanSchema,
  JsonRefSchema,
  JsonSchemaTypeName,
  XFormula,
} from '../../types/schema.types.js';
import { JsonSchemaStore } from './json-schema.store.js';
import { JsonBooleanValueStore } from '../value/json-boolean-value.store.js';
import { addSharedFieldsFromState } from '../../lib/addSharedFieldsFromStore.js';

export class JsonBooleanStore
  extends EventEmitter
  implements JsonBooleanSchema
{
  public readonly type = JsonSchemaTypeName.Boolean;

  public $ref: string = '';
  public name: string = '';
  public parent: JsonSchemaStore | null = null;

  public default: boolean = false;
  public readOnly?: boolean;
  public title?: string;
  public description?: string;
  public deprecated?: boolean;
  public 'x-formula'?: XFormula;

  private readonly valuesMap: Map<string, JsonBooleanValueStore[]> = new Map<
    string,
    JsonBooleanValueStore[]
  >();

  constructor(public readonly nodeId: string = nanoid()) {
    super();
  }

  public registerValue(value: JsonBooleanValueStore): number {
    const length = this.getOrCreateValues(value.rowId).push(value);
    return length - 1;
  }

  public getValue(
    rowId: string,
    index: number = 0,
  ): JsonBooleanValueStore | undefined {
    return this.getOrCreateValues(rowId)[index];
  }

  public getPlainSchema(options?: {
    skip$Ref?: boolean;
  }): JsonBooleanSchema | JsonRefSchema {
    if (this.$ref && options?.skip$Ref !== true) {
      return addSharedFieldsFromState({ $ref: this.$ref }, this);
    }

    return addSharedFieldsFromState(
      {
        type: this.type,
        default: this.default,
        ...(this.readOnly ? { readOnly: this.readOnly } : {}),
        ...(this['x-formula'] ? { 'x-formula': this['x-formula'] } : {}),
      },
      this,
    );
  }

  private getOrCreateValues(rowId: string): JsonBooleanValueStore[] {
    let values = this.valuesMap.get(rowId);

    if (!values) {
      values = [];
      this.valuesMap.set(rowId, values);
    }

    return values;
  }
}
