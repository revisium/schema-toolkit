import { JsonSchemaTypeName } from '../types/schema.types.js';
import { JsonValueStore } from '../model/value/json-value.store.js';
import { traverseValue } from './traverseValue.js';

export type ReplaceForeignKeyValueOptions = {
  valueStore: JsonValueStore;
  foreignKey: string;
  value: string;
  nextValue: string;
};

export const replaceForeignKeyValue = (
  options: ReplaceForeignKeyValueOptions,
) => {
  let wasUpdated = false;

  traverseValue(options.valueStore, (item) => {
    if (
      item.type === JsonSchemaTypeName.String &&
      item.foreignKey === options.foreignKey &&
      item.value === options.value
    ) {
      item.value = options.nextValue;
      wasUpdated = true;
    }
  });

  return wasUpdated;
};
