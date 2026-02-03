import { nanoid } from 'nanoid';
import type { SchemaNode } from '../../core/schema-node/index.js';
import {
  createObjectNode,
  createArrayNode,
  createStringNode,
  createNumberNode,
  createBooleanNode,
  makeNodeReactive,
} from '../../core/schema-node/index.js';
import type { ReactivityAdapter } from '../../core/reactivity/index.js';
import type { FieldType } from './types.js';

export class NodeFactory {
  private readonly _reactivity: ReactivityAdapter | undefined;

  constructor(reactivity?: ReactivityAdapter) {
    this._reactivity = reactivity;
  }

  createNode(name: string, type: FieldType): SchemaNode {
    let node: SchemaNode;

    switch (type) {
      case 'string':
        node = createStringNode(nanoid(), name, { defaultValue: '' });
        break;
      case 'number':
        node = createNumberNode(nanoid(), name, { defaultValue: 0 });
        break;
      case 'boolean':
        node = createBooleanNode(nanoid(), name, { defaultValue: false });
        break;
      case 'object':
        node = createObjectNode(nanoid(), name, []);
        break;
      case 'array':
        node = this.createArrayNodeInternal(name);
        break;
      default:
        throw new Error(`Unknown field type: ${type}`);
    }

    this.applyReactivity(node);
    return node;
  }

  private createArrayNodeInternal(name: string): SchemaNode {
    const items = createStringNode(nanoid(), 'items', { defaultValue: '' });
    this.applyReactivity(items);
    return createArrayNode(nanoid(), name, items);
  }

  createArrayNodeWithItems(name: string, items: SchemaNode): SchemaNode {
    const node = createArrayNode(nanoid(), name, items);
    this.applyReactivity(node);
    return node;
  }

  private applyReactivity(node: SchemaNode): void {
    if (this._reactivity) {
      makeNodeReactive(node, this._reactivity);
    }
  }
}
