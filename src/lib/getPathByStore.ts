import { JsonSchemaStore } from '../model/schema/json-schema.store.js';

export const getPathByStore = (store: JsonSchemaStore): string => {
  let node = store;

  let path = '';

  while (node.parent) {
    if (node.parent.type === 'object') {
      path = `/properties/${node.name}${path}`;
    } else if (node.parent.type === 'array') {
      path = `/items${path}`;
    }

    node = node.parent;
  }

  if (!path) {
    return '/';
  }

  return `${path}`;
};
