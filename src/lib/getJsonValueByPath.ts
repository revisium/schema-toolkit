import { JsonArrayValueStore } from '../model/value/json-array-value.store.js';
import { JsonObjectValueStore } from '../model/value/json-object-value.store.js';
import { JsonValueStore } from '../model/value/json-value.store.js';
import { parsePath } from './json-path-utils.js';

export const getJsonValueStoreByPath = (
  root: JsonValueStore,
  path: string,
): JsonValueStore => {
  if (!path) {
    return root;
  }

  const segments = parsePath(path);

  let current: JsonValueStore = root;

  for (const seg of segments) {
    if (current instanceof JsonObjectValueStore) {
      const next = current.value[String(seg)];
      if (!next) {
        throw new Error(`Path not found at segment "${seg}"`);
      }
      current = next;
    } else if (current instanceof JsonArrayValueStore) {
      if (typeof seg !== 'number') {
        throw new Error(`Invalid array index "${seg}"`);
      }
      const next = current.value[seg];
      if (!next) {
        throw new Error(`Path not found at segment "${seg}"`);
      }
      current = next;
    } else {
      throw new Error(`Cannot navigate into primitive at segment "${seg}"`);
    }
  }

  return current;
};

