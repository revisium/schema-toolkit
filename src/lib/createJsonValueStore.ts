import {
  JsonArray,
  JsonObject,
  JsonPrimitives,
  JsonValue,
} from '../types/json.types.js';
import { JsonSchemaTypeName } from '../types/schema.types.js';
import { JsonArrayStore } from '../model/schema/json-array.store.js';
import { JsonObjectStore } from '../model/schema/json-object.store.js';
import {
  JsonSchemaStore,
  JsonSchemaStorePrimitives,
} from '../model/schema/json-schema.store.js';
import { JsonArrayValueStore } from '../model/value/json-array-value.store.js';
import { JsonBooleanValueStore } from '../model/value/json-boolean-value.store.js';
import { JsonNumberValueStore } from '../model/value/json-number-value.store.js';
import { JsonObjectValueStore } from '../model/value/json-object-value.store.js';
import { JsonStringValueStore } from '../model/value/json-string-value.store.js';
import {
  JsonValueStore,
  JsonValueStorePrimitives,
} from '../model/value/json-value.store.js';

export const createJsonValueStore = (
  schema: JsonSchemaStore,
  rowId: string,
  rawValue: JsonValue,
): JsonValueStore => {
  if (schema.type === JsonSchemaTypeName.Object) {
    return createJsonObjectValueStore(schema, rowId, rawValue as JsonObject);
  } else if (schema.type === JsonSchemaTypeName.Array) {
    return createJsonArrayValueStore(schema, rowId, rawValue as JsonArray);
  } else {
    return createPrimitiveValueStore(schema, rowId, rawValue as JsonPrimitives);
  }
};

export const createJsonObjectValueStore = (
  schema: JsonObjectStore,
  rowId: string,
  rawValue: JsonObject,
): JsonObjectValueStore => {
  const value = Object.entries(rawValue).reduce<Record<string, JsonValueStore>>(
    (reduceValue, [key, itemValue]) => {
      const itemSchema = schema.getProperty(key);

      if (itemSchema === undefined || itemValue === undefined) {
        throw new Error('Invalid item');
      }

      reduceValue[key] = createJsonValueStore(itemSchema, rowId, itemValue);

      return reduceValue;
    },
    {},
  );

  return new JsonObjectValueStore(schema, rowId, value);
};

export const createJsonArrayValueStore = (
  schema: JsonArrayStore,
  rowId: string,
  rawValue: JsonArray,
): JsonArrayValueStore => {
  const value = rawValue.map((value) =>
    createJsonValueStore(schema.items, rowId, value),
  );

  return new JsonArrayValueStore(schema, rowId, value);
};

export const createPrimitiveValueStore = (
  schema: JsonSchemaStorePrimitives,
  rowId: string,
  rawValue: JsonPrimitives,
): JsonValueStorePrimitives => {
  if (schema.type === JsonSchemaTypeName.String) {
    return new JsonStringValueStore(schema, rowId, rawValue as string | null);
  } else if (schema.type === JsonSchemaTypeName.Number) {
    return new JsonNumberValueStore(schema, rowId, rawValue as number | null);
  } else if (schema.type === JsonSchemaTypeName.Boolean) {
    return new JsonBooleanValueStore(schema, rowId, rawValue as boolean | null);
  } else {
    throw new Error('this type is not allowed');
  }
};
