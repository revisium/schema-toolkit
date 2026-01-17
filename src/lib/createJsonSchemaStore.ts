import {
  JsonObjectSchema,
  JsonSchema,
  JsonSchemaPrimitives,
  JsonSchemaTypeName,
} from '../types/schema.types.js';
import { JsonArrayStore } from '../model/schema/json-array.store.js';
import { JsonBooleanStore } from '../model/schema/json-boolean.store.js';
import { JsonNumberStore } from '../model/schema/json-number.store.js';
import { JsonStringStore } from '../model/schema/json-string.store.js';
import { JsonObjectStore } from '../model/schema/json-object.store.js';
import {
  JsonSchemaStore,
  JsonSchemaStorePrimitives,
} from '../model/schema/json-schema.store.js';

export type RefsType = Record<string, JsonSchema>;

export const createJsonSchemaStore = (
  schema: JsonSchema,
  refs: RefsType = {},
): JsonSchemaStore => {
  if ('$ref' in schema) {
    const refSchema: JsonSchema | undefined = refs[schema.$ref];

    if (!refSchema) {
      throw new Error(`Not found schema for $ref="${schema.$ref}"`);
    }

    const refStore = createJsonSchemaStore(refSchema, refs);
    saveSharedFields(refStore, schema);
    refStore.$ref = schema.$ref;
    return refStore;
  } else if (schema.type === JsonSchemaTypeName.Object) {
    const objectStore = createJsonObjectSchemaStore(schema, refs);
    saveSharedFields(objectStore, schema);

    return objectStore;
  } else if (schema.type === JsonSchemaTypeName.Array) {
    const itemsStore = createJsonSchemaStore(schema.items, refs);
    const arrayStore = new JsonArrayStore(itemsStore);
    saveSharedFields(arrayStore, schema);

    return arrayStore;
  } else {
    const primitivesStore = createPrimitiveStoreBySchema(schema);
    saveSharedFields(primitivesStore, schema);
    primitivesStore.readOnly = schema.readOnly;

    return primitivesStore;
  }
};

export const createJsonObjectSchemaStore = (
  value: JsonObjectSchema,
  refs: RefsType,
): JsonObjectStore => {
  const store = new JsonObjectStore();

  for (const requiredField of value.required) {
    if (!value.properties[requiredField]) {
      throw new Error(
        `Not found required field "${requiredField}" in "properties"`,
      );
    }
  }

  Object.entries(value.properties).forEach(([name, item]) => {
    store.addPropertyWithStore(name, createJsonSchemaStore(item, refs));
  });

  return store;
};

export const createPrimitiveStoreBySchema = (
  schema: JsonSchemaPrimitives,
): JsonSchemaStorePrimitives => {
  if (schema.type === JsonSchemaTypeName.String) {
    const stringStore = new JsonStringStore();
    stringStore.foreignKey = schema.foreignKey;
    stringStore.format = schema.format;
    stringStore.enum = schema.enum;
    stringStore.contentMediaType = schema.contentMediaType;
    stringStore.pattern = schema.pattern;
    stringStore['x-formula'] = schema['x-formula'];
    return stringStore;
  } else if (schema.type === JsonSchemaTypeName.Number) {
    const numberStore = new JsonNumberStore();
    numberStore['x-formula'] = schema['x-formula'];
    return numberStore;
  } else if (schema.type === JsonSchemaTypeName.Boolean) {
    const booleanStore = new JsonBooleanStore();
    booleanStore['x-formula'] = schema['x-formula'];
    return booleanStore;
  } else {
    throw new Error('this type is not allowed');
  }
};

export const saveSharedFields = (
  store: JsonSchemaStore,
  schema: JsonSchema,
) => {
  store.title = schema.title;
  store.description = schema.description;
  store.deprecated = schema.deprecated;
};
