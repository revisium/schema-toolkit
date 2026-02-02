import { nanoid } from 'nanoid';
import type { SchemaNode } from '../../core/schema-node/index.js';
import {
  createObjectNode,
  createArrayNode,
  createStringNode,
  createNumberNode,
  createBooleanNode,
} from '../../core/schema-node/index.js';
import type { FieldType } from './types.js';

export class NodeFactory {
  createNode(name: string, type: FieldType): SchemaNode {
    switch (type) {
      case 'string':
        return createStringNode(nanoid(), name, { defaultValue: '' });
      case 'number':
        return createNumberNode(nanoid(), name, { defaultValue: 0 });
      case 'boolean':
        return createBooleanNode(nanoid(), name, { defaultValue: false });
      case 'object':
        return createObjectNode(nanoid(), name, []);
      case 'array':
        return this.createArrayNode(name);
      default:
        throw new Error(`Unknown field type: ${type}`);
    }
  }

  private createArrayNode(name: string): SchemaNode {
    const items = createStringNode(nanoid(), 'items', { defaultValue: '' });
    return createArrayNode(nanoid(), name, items);
  }
}
