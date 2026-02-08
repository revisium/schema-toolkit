import { JsonBooleanStore } from '../schema/json-boolean.store.js';
import { JsonValueStoreParent } from './json-value.store.js';

export class JsonBooleanValueStore {
  public readonly type = 'boolean' as const;

  public readonly index: number;

  public parent: JsonValueStoreParent | null = null;

  constructor(
    public readonly schema: JsonBooleanStore,
    public readonly rowId: string,
    public value: boolean | null = null,
  ) {
    this.index = this.schema.registerValue(this);
  }

  public getPlainValue() {
    return this.value ?? this.schema.default;
  }
}
