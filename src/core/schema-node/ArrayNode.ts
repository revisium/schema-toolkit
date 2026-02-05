import type { SchemaNode, NodeType, NodeMetadata } from './types.js';
import { EMPTY_METADATA } from './types.js';
import { BaseNode } from './BaseNode.js';
import { makeObservable } from '../reactivity/index.js';

export interface ArrayNodeOptions {
  metadata?: NodeMetadata;
  ref?: string;
}

export class ArrayNode extends BaseNode {
  private _items: SchemaNode;

  constructor(
    id: string,
    name: string,
    items: SchemaNode,
    options: ArrayNodeOptions = {},
  ) {
    super(id, name, options.metadata ?? EMPTY_METADATA, options.ref);
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
      { metadata: this.metadata(), ref: this._ref },
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
  options: ArrayNodeOptions | NodeMetadata = {},
): SchemaNode {
  const opts: ArrayNodeOptions =
    'title' in options || 'description' in options || 'deprecated' in options
      ? { metadata: options as NodeMetadata }
      : (options as ArrayNodeOptions);
  return new ArrayNode(id, name, items, opts);
}
