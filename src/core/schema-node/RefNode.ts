import type { SchemaNode, NodeType, NodeMetadata } from './types.js';
import { EMPTY_METADATA } from './types.js';
import { BaseNode } from './BaseNode.js';

export class RefNode extends BaseNode {
  constructor(
    id: string,
    name: string,
    ref: string,
    metadata: NodeMetadata = EMPTY_METADATA,
  ) {
    super(id, name, metadata, ref);
    if (!ref) {
      throw new Error('RefNode requires a non-empty ref');
    }
    this.initBaseObservable();
  }

  nodeType(): NodeType {
    return 'ref';
  }

  clone(): SchemaNode {
    const ref = this.ref();
    if (!ref) {
      throw new Error('RefNode must have a ref value');
    }
    return new RefNode(this.id(), this.name(), ref, this.metadata());
  }

  cloneWithId(newId: string): SchemaNode {
    const ref = this.ref();
    if (!ref) {
      throw new Error('RefNode must have a ref value');
    }
    return new RefNode(newId, this.name(), ref, this.metadata());
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
