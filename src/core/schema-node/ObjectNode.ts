import type { SchemaNode, NodeType, NodeMetadata, Formula } from './types.js';
import { EMPTY_METADATA } from './types.js';
import { NULL_NODE } from './NullNode.js';

export class ObjectNode implements SchemaNode {
  constructor(
    private readonly _id: string,
    private readonly _name: string,
    private readonly _children: readonly SchemaNode[] = [],
    private readonly _metadata: NodeMetadata = EMPTY_METADATA,
  ) {}

  id(): string {
    return this._id;
  }

  name(): string {
    return this._name;
  }

  nodeType(): NodeType {
    return 'object';
  }

  metadata(): NodeMetadata {
    return this._metadata;
  }

  isObject(): boolean {
    return true;
  }

  isArray(): boolean {
    return false;
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

  property(name: string): SchemaNode {
    return this._children.find((child) => child.name() === name) ?? NULL_NODE;
  }

  properties(): readonly SchemaNode[] {
    return this._children;
  }

  items(): SchemaNode {
    return NULL_NODE;
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
    return new ObjectNode(
      this._id,
      this._name,
      this._children.map((child) => child.clone()),
      this._metadata,
    );
  }
}

export function createObjectNode(
  id: string,
  name: string,
  children: readonly SchemaNode[] = [],
  metadata: NodeMetadata = EMPTY_METADATA,
): SchemaNode {
  return new ObjectNode(id, name, children, metadata);
}
