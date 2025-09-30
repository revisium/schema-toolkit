import { JsonArrayStore } from './json-array.store.js';
import { JsonBooleanStore } from './json-boolean.store.js';
import { JsonNumberStore } from './json-number.store.js';
import { JsonObjectStore } from './json-object.store.js';
import { JsonStringStore } from './json-string.store.js';

export type JsonSchemaStorePrimitives =
  | JsonStringStore
  | JsonNumberStore
  | JsonBooleanStore;

export type JsonSchemaStore =
  | JsonObjectStore
  | JsonArrayStore
  | JsonSchemaStorePrimitives;
