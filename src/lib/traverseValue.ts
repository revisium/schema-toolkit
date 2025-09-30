import { JsonSchemaTypeName } from '../types/schema.types.js';
import { JsonValueStore } from '../model/value/json-value.store.js';

export const traverseValue = (
  store: JsonValueStore,
  callback: (node: JsonValueStore) => void,
) => {
  callback(store);

  if (store.type === JsonSchemaTypeName.Object) {
    Object.values(store.value).forEach((item) => {
      traverseValue(item, callback);
    });
  } else if (store.type === JsonSchemaTypeName.Array) {
    store.value.forEach((itemValue) => {
      traverseValue(itemValue, callback);
    });
  }
};
