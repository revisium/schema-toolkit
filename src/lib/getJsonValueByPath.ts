import { JsonArrayValueStore } from '../model/value/json-array-value.store.js';
import { JsonObjectValueStore } from '../model/value/json-object-value.store.js';
import { JsonValueStore } from '../model/value/json-value.store.js';

export const getJsonValueStoreByPath = (
  root: JsonValueStore,
  path: string,
): JsonValueStore => {
  if (!path) {
    return root;
  }

  const segments = getSegments(path);

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

const regex = /([^.[\]]+)|\[(\d+)]/g;

const getSegments = (path: string) => {
  const segments: (string | number)[] = [];

  let match: RegExpExecArray | null;

  while ((match = regex.exec(path))) {
    if (match[1] !== undefined) {
      segments.push(match[1]);
    } else if (match[2] !== undefined) {
      segments.push(Number(match[2]));
    }
  }

  return segments;
};
