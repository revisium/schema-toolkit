import { JsonSchemaStore } from '../model/schema/json-schema.store.js';

export const traverseStore = (
  store: JsonSchemaStore,
  callback: (node: JsonSchemaStore) => void,
) => {
  callback(store);

  if (store.type === 'object') {
    Object.values(store.properties).forEach((item) => {
      traverseStore(item, callback);
    });
  } else if (store.type === 'array') {
    traverseStore(store.items, callback);
  }
};
