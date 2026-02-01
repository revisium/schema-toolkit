import type { SchemaNode, NodeType, NodeMetadata, Formula } from './types.js';
import { EMPTY_METADATA } from './types.js';
import { NULL_NODE } from './NullNode.js';

export class ArrayNode implements SchemaNode {
  constructor(
    private readonly _id: string,
    private readonly _name: string,
    private readonly _items: SchemaNode,
    private readonly _metadata: NodeMetadata = EMPTY_METADATA,
  ) {}

  id(): string {
    return this._id;
  }

  name(): string {
    return this._name;
  }

  nodeType(): NodeType {
    return 'array';
  }

  metadata(): NodeMetadata {
    return this._metadata;
  }

  isObject(): boolean {
    return false;
  }

  isArray(): boolean {
    return true;
  }

  isPrimitive(): boolean {
    return false;
  }

  isRef(): boolean {
    return false;
  }

  isNull(): boolean {
    return false;
  }

  property(): SchemaNode {
    return NULL_NODE;
  }

  properties(): readonly SchemaNode[] {
    return [this._items];
  }

  items(): SchemaNode {
    return this._items;
  }

  ref(): string | undefined {
    return undefined;
  }

  formula(): Formula | undefined {
    return undefined;
  }

  hasFormula(): boolean {
    return false;
  }

  defaultValue(): unknown {
    return undefined;
  }

  foreignKey(): string | undefined {
    return undefined;
  }

  clone(): SchemaNode {
    return new ArrayNode(
      this._id,
      this._name,
      this._items.clone(),
      this._metadata,
    );
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
