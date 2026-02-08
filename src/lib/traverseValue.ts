import { JsonValueStore } from '../model/value/json-value.store.js';

export const traverseValue = (
  store: JsonValueStore,
  callback: (node: JsonValueStore) => void,
) => {
  callback(store);

  if (store.type === 'object') {
    Object.values(store.value).forEach((item) => {
      traverseValue(item, callback);
    });
  } else if (store.type === 'array') {
    store.value.forEach((itemValue) => {
      traverseValue(itemValue, callback);
    });
  }
};
