import { JsonSchemaTypeName } from '../types/schema.types.js';
import { JsonSchemaStore } from '../model/schema/json-schema.store.js';

export const getDBJsonPathByJsonSchemaStore = (
  store: JsonSchemaStore,
): string => {
  let node = store;

  let path = '';

  while (node.parent) {
    if (node.parent.type === JsonSchemaTypeName.Object) {
      path = `.${node.name}${path}`;
    } else if (node.parent.type === JsonSchemaTypeName.Array) {
      path = `[*]${path}`;
    }

    node = node.parent;
  }

  if (!path) {
    return '$';
  }

  return `$${path}`;
};
