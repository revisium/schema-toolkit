import type { SchemaNode, NodeType, NodeMetadata, Formula } from './types.js';
import { EMPTY_METADATA } from './types.js';
import { NULL_NODE } from './NullNode.js';

export class RefNode implements SchemaNode {
  constructor(
    private readonly _id: string,
    private readonly _name: string,
    private readonly _ref: string,
    private readonly _metadata: NodeMetadata = EMPTY_METADATA,
  ) {
    if (!_ref) {
      throw new Error('RefNode requires a non-empty ref');
    }
  }

  id(): string {
    return this._id;
  }

  name(): string {
    return this._name;
  }

  nodeType(): NodeType {
    return 'ref';
  }

  metadata(): NodeMetadata {
    return this._metadata;
  }

  isObject(): boolean {
    return false;
  }

  isArray(): boolean {
    return false;
  }

  isPrimitive(): boolean {
    return false;
  }

  isRef(): boolean {
    return true;
  }

  isNull(): boolean {
    return false;
  }

  property(): SchemaNode {
    return NULL_NODE;
  }

  properties(): readonly SchemaNode[] {
    return [];
  }

  items(): SchemaNode {
    return NULL_NODE;
  }

  ref(): string | undefined {
    return this._ref;
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
    return new RefNode(this._id, this._name, this._ref, this._metadata);
  }
}

export function createRefNode(
  id: string,
  name: string,
  ref: string,
  metadata: NodeMetadata = EMPTY_METADATA,
): SchemaNode {
  return new RefNode(id, name, ref, metadata);
}
