import { JsonArray, JsonValue } from '../../types/json.types.js';
import {
  JsonArrayStore,
  MigrateItemsEvent,
  ReplaceItemsEvent,
} from '../schema/json-array.store.js';
import { createJsonValueStore } from '../../lib/createJsonValueStore.js';
import { JsonValueStore, JsonValueStoreParent } from './json-value.store.js';
import { getTransformation } from './value-transformation.js';

export class JsonArrayValueStore {
  public readonly type = 'array' as const;

  public index: number;

  public parent: JsonValueStoreParent | null = null;

  constructor(
    public readonly schema: JsonArrayStore,
    public readonly rowId: string,
    public value: JsonValueStore[],
  ) {
    this.index = this.schema.registerValue(this);
    this.init();
  }

  public getPlainValue(): JsonArray {
    return this.value.map((item) => item.getPlainValue());
  }

  public migrateItems(event: MigrateItemsEvent) {
    const transformation = getTransformation(event.previousItems, event.items);

    this.value = this.value.map((valueItem) => {
      const rawValue = transformation
        ? (transformation(
            valueItem.getPlainValue(),
            event.items.default,
          ) as JsonValue)
        : event.items.default;

      return createJsonValueStore(event.items, this.rowId, rawValue);
    });
  }

  public replaceItems(event: ReplaceItemsEvent) {
    this.value = this.value.map(() => {
      const rawValue = this.getReplacedValue(event);

      return createJsonValueStore(event.items, this.rowId, rawValue);
    });
  }

  private getReplacedValue(event: ReplaceItemsEvent): JsonValue {
    const previousValue = event.items.getValue(this.rowId);

    if (previousValue) {
      return previousValue.getPlainValue();
    }

    return event.items.default;
  }

  private init() {
    for (const value of this.value) {
      value.parent = this;
    }
  }
}
