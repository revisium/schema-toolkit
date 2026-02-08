import { JsonSchemaStore } from '../model/schema/json-schema.store.js';

export const getDBJsonPathByJsonSchemaStore = (
  store: JsonSchemaStore,
): string => {
  let node = store;

  let path = '';

  while (node.parent) {
    if (node.parent.type === 'object') {
      path = `.${node.name}${path}`;
    } else if (node.parent.type === 'array') {
      path = `[*]${path}`;
    }

    node = node.parent;
  }

  if (!path) {
    return '$';
  }

  return `$${path}`;
};
