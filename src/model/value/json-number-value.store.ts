import { JsonSchemaTypeName } from '../../types/schema.types.js';
import { JsonNumberStore } from '../schema/json-number.store.js';
import { JsonValueStoreParent } from './json-value.store.js';

export class JsonNumberValueStore {
  public readonly type = JsonSchemaTypeName.Number;

  public readonly index: number;

  public parent: JsonValueStoreParent | null = null;

  constructor(
    public readonly schema: JsonNumberStore,
    public readonly rowId: string,
    public value: number | null = null,
  ) {
    this.index = this.schema.registerValue(this);
  }

  public getPlainValue() {
    return this.value ?? this.schema.default;
  }
}
