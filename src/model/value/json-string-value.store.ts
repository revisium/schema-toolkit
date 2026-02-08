import { JsonStringStore } from '../schema/json-string.store.js';
import { JsonValueStoreParent } from './json-value.store.js';

export class JsonStringValueStore {
  public readonly type = 'string' as const;

  public readonly index: number;

  public parent: JsonValueStoreParent | null = null;

  constructor(
    public readonly schema: JsonStringStore,
    public readonly rowId: string,
    public value: string | null = null,
  ) {
    this.index = this.schema.registerValue(this);
  }

  public get foreignKey() {
    return this.schema.foreignKey;
  }

  public getPlainValue() {
    return this.value ?? this.schema.default;
  }
}
