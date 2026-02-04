import type { SchemaNode, NodeType, NodeMetadata } from './types.js';
import { EMPTY_METADATA } from './types.js';
import { BaseNode } from './BaseNode.js';

export class RefNode extends BaseNode {
  private readonly _ref: string;

  constructor(
    id: string,
    name: string,
    ref: string,
    metadata: NodeMetadata = EMPTY_METADATA,
  ) {
    super(id, name, metadata);
    if (!ref) {
      throw new Error('RefNode requires a non-empty ref');
    }
    this._ref = ref;
    this.initBaseObservable();
  }

  nodeType(): NodeType {
    return 'ref';
  }

  isRef(): boolean {
    return true;
  }

  ref(): string | undefined {
    return this._ref;
  }

  clone(): SchemaNode {
    return new RefNode(this.id(), this.name(), this._ref, this.metadata());
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
