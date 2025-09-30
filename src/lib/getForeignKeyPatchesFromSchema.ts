import { JsonSchemaTypeName } from '../types/schema.types.js';
import { JsonPatch, JsonPatchReplace } from '../types/json-patch.types.js';
import { JsonSchemaStore } from '../model/schema/json-schema.store.js';
import { getPathByStore } from './getPathByStore.js';
import { traverseStore } from './traverseStore.js';

export const getForeignKeyPatchesFromSchema = (
  store: JsonSchemaStore,
  options: { tableId: string; nextTableId: string },
) => {
  const stores: JsonPatch[] = [];

  traverseStore(store, (item) => {
    if (
      item.type === JsonSchemaTypeName.String &&
      item.foreignKey === options.tableId
    ) {
      item.foreignKey = options.nextTableId;

      const patch: JsonPatchReplace = {
        op: 'replace',
        path: getPathByStore(item),
        value: item.getPlainSchema(),
      };

      stores.push(patch);
    }
  });

  return stores;
};
