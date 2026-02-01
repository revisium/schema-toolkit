import type { SchemaNode, NodeType, NodeMetadata, Formula } from './types.js';
import { PrimitiveNode } from './PrimitiveNode.js';

export interface StringNodeOptions {
  readonly defaultValue?: string;
  readonly foreignKey?: string;
  readonly formula?: Formula;
  readonly metadata?: NodeMetadata;
}

export class StringNode extends PrimitiveNode {
  constructor(
    id: string,
    name: string,
    options: StringNodeOptions = {},
  ) {
    super(id, name, options);
  }

  nodeType(): NodeType {
    return 'string';
  }

  clone(): SchemaNode {
    return new StringNode(this.id(), this.name(), this._options as StringNodeOptions);
  }
}

export function createStringNode(
  id: string,
  name: string,
  options: StringNodeOptions = {},
): SchemaNode {
  return new StringNode(id, name, options);
}
