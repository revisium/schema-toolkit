import { JsonSchemaTypeName } from '../types/schema.types.js';
import { JsonSchemaStore } from '../model/schema/json-schema.store.js';
import { traverseStore } from './traverseStore.js';

export const getForeignKeysFromSchema = (store: JsonSchemaStore): string[] => {
  const foreignKeys = new Set<string>();

  traverseStore(store, (item) => {
    if (item.type === JsonSchemaTypeName.String && item.foreignKey) {
      foreignKeys.add(item.foreignKey);
    }
  });

  return [...foreignKeys].sort((a, b) => a.localeCompare(b));
};
