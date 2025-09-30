import { JsonSchemaTypeName } from '../types/schema.types.js';
import { JsonValueStore } from '../model/value/json-value.store.js';
import { traverseValue } from './traverseValue.js';

export type GetForeignKeysFromValueType = {
  tableId: string;
  rowIds: string[];
};

export const getForeignKeysFromValue = (
  value: JsonValueStore,
): GetForeignKeysFromValueType[] => {
  const foreignKeys = new Map<string, Set<string>>();

  traverseValue(value, (item) => {
    if (item.type === JsonSchemaTypeName.String && item.foreignKey) {
      let tableForeignKey = foreignKeys.get(item.foreignKey);

      if (!tableForeignKey) {
        tableForeignKey = new Set<string>();
        foreignKeys.set(item.foreignKey, tableForeignKey);
      }

      tableForeignKey.add(item.getPlainValue());
    }
  });

  return [...foreignKeys].map(([tableId, rowIds]) => ({
    tableId,
    rowIds: [...rowIds].sort((a, b) => a.localeCompare(b)),
  }));
};
