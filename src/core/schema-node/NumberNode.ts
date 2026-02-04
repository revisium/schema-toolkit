import type { SchemaNode, NodeType, NodeMetadata, Formula } from './types.js';
import { PrimitiveNode } from './PrimitiveNode.js';

export interface NumberNodeOptions {
  readonly defaultValue?: number;
  readonly formula?: Formula;
  readonly metadata?: NodeMetadata;
}

export class NumberNode extends PrimitiveNode {
  constructor(
    id: string,
    name: string,
    options: NumberNodeOptions = {},
  ) {
    super(id, name, options);
    this.initPrimitiveObservable();
  }

  nodeType(): NodeType {
    return 'number';
  }

  clone(): SchemaNode {
    return new NumberNode(this.id(), this.name(), this.cloneOptions());
  }

  private cloneOptions(): NumberNodeOptions {
    return {
      defaultValue: this._defaultValue as number | undefined,
      formula: this._formula,
      metadata: this._metadata,
    };
  }
}

export function createNumberNode(
  id: string,
  name: string,
  options: NumberNodeOptions = {},
): SchemaNode {
  return new NumberNode(id, name, options);
}
