import type { SchemaNode, NodeType, NodeMetadata, Formula } from './types.js';
import { PrimitiveNode } from './PrimitiveNode.js';

export interface BooleanNodeOptions {
  readonly defaultValue?: boolean;
  readonly formula?: Formula;
  readonly metadata?: NodeMetadata;
}

export class BooleanNode extends PrimitiveNode {
  constructor(
    id: string,
    name: string,
    options: BooleanNodeOptions = {},
  ) {
    super(id, name, options);
  }

  nodeType(): NodeType {
    return 'boolean';
  }

  clone(): SchemaNode {
    return new BooleanNode(this.id(), this.name(), this._options as BooleanNodeOptions);
  }
}

export function createBooleanNode(
  id: string,
  name: string,
  options: BooleanNodeOptions = {},
): SchemaNode {
  return new BooleanNode(id, name, options);
}
