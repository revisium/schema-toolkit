import type { SchemaNode, NodeType, NodeMetadata } from './types.js';
import { EMPTY_METADATA } from './types.js';
import { BaseNode } from './BaseNode.js';
import { makeObservable } from '../reactivity/index.js';

export class ArrayNode extends BaseNode {
  private _items: SchemaNode;

  constructor(
    id: string,
    name: string,
    items: SchemaNode,
    metadata: NodeMetadata = EMPTY_METADATA,
  ) {
    super(id, name, metadata);
    this._items = items;
    this.initBaseObservable();
    makeObservable(this, {
      _items: 'observable.ref',
      setItems: 'action',
    });
  }

  nodeType(): NodeType {
    return 'array';
  }

  isArray(): boolean {
    return true;
  }

  properties(): readonly SchemaNode[] {
    return [this._items];
  }

  items(): SchemaNode {
    return this._items;
  }

  clone(): SchemaNode {
    return new ArrayNode(
      this.id(),
      this.name(),
      this._items.clone(),
      this.metadata(),
    );
  }

  setItems(node: SchemaNode): void {
    this._items = node;
  }
}

export function createArrayNode(
  id: string,
  name: string,
  items: SchemaNode,
  metadata: NodeMetadata = EMPTY_METADATA,
): SchemaNode {
  return new ArrayNode(id, name, items, metadata);
}
