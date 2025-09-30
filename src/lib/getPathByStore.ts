import { JsonSchemaTypeName } from '../types/schema.types.js';
import { JsonSchemaStore } from '../model/schema/json-schema.store.js';

export const getPathByStore = (store: JsonSchemaStore): string => {
  let node = store;

  let path = '';

  while (node.parent) {
    if (node.parent.type === JsonSchemaTypeName.Object) {
      path = `/properties/${node.name}${path}`;
    } else if (node.parent.type === JsonSchemaTypeName.Array) {
      path = `/items${path}`;
    }

    node = node.parent;
  }

  if (!path) {
    return '/';
  }

  return `${path}`;
};
