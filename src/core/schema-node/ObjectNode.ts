import type { SchemaNode, NodeType, NodeMetadata } from './types.js';
import { EMPTY_METADATA } from './types.js';
import { BaseNode } from './BaseNode.js';
import { NULL_NODE } from './NullNode.js';
import { makeObservable } from '../reactivity/index.js';

export interface ObjectNodeOptions {
  metadata?: NodeMetadata;
  ref?: string;
}

export class ObjectNode extends BaseNode {
  private _children: SchemaNode[];

  constructor(
    id: string,
    name: string,
    children: readonly SchemaNode[] = [],
    options: ObjectNodeOptions = {},
  ) {
    super(id, name, options.metadata ?? EMPTY_METADATA, options.ref);
    this._children = [...children];
    this.initBaseObservable();
    makeObservable(this, {
      _children: 'observable.shallow',
      addChild: 'action',
      removeChild: 'action',
      replaceChild: 'action',
    });
  }

  nodeType(): NodeType {
    return 'object';
  }

  isObject(): boolean {
    return true;
  }

  property(name: string): SchemaNode {
    return this._children.find((child) => child.name() === name) ?? NULL_NODE;
  }

  properties(): readonly SchemaNode[] {
    return this._children;
  }

  clone(): SchemaNode {
    return new ObjectNode(
      this.id(),
      this.name(),
      this._children.map((child) => child.clone()),
      { metadata: this.metadata(), ref: this._ref },
    );
  }

  addChild(node: SchemaNode): void {
    this._children.push(node);
  }

  removeChild(name: string): boolean {
    const index = this._children.findIndex((child) => child.name() === name);
    if (index === -1) {
      return false;
    }
    this._children.splice(index, 1);
    return true;
  }

  replaceChild(name: string, node: SchemaNode): boolean {
    const index = this._children.findIndex((child) => child.name() === name);
    if (index === -1) {
      return false;
    }
    this._children[index] = node;
    return true;
  }
}

export function createObjectNode(
  id: string,
  name: string,
  children: readonly SchemaNode[] = [],
  options: ObjectNodeOptions | NodeMetadata = {},
): SchemaNode {
  const opts: ObjectNodeOptions =
    'title' in options || 'description' in options || 'deprecated' in options
      ? { metadata: options as NodeMetadata }
      : (options as ObjectNodeOptions);
  return new ObjectNode(id, name, children, opts);
}
