import { JsonArrayValueStore } from './json-array-value.store.js';
import { JsonBooleanValueStore } from './json-boolean-value.store.js';
import { JsonNumberValueStore } from './json-number-value.store.js';
import { JsonObjectValueStore } from './json-object-value.store.js';
import { JsonStringValueStore } from './json-string-value.store.js';

export type JsonValueStorePrimitives =
  | JsonStringValueStore
  | JsonNumberValueStore
  | JsonBooleanValueStore;

export type JsonValueStoreParent = JsonObjectValueStore | JsonArrayValueStore;

export type JsonValueStore = JsonValueStoreParent | JsonValueStorePrimitives;
