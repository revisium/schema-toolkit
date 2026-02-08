import { JsonSchemaStore } from '../model/schema/json-schema.store.js';
import { traverseStore } from './traverseStore.js';

export const getForeignKeysFromSchema = (store: JsonSchemaStore): string[] => {
  const foreignKeys = new Set<string>();

  traverseStore(store, (item) => {
    if (item.type === 'string' && item.foreignKey) {
      foreignKeys.add(item.foreignKey);
    }
  });

  return [...foreignKeys].sort((a, b) => a.localeCompare(b));
};
