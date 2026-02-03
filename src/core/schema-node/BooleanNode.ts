import type { SchemaNode, NodeType, NodeMetadata, Formula } from './types.js';
import { PrimitiveNode } from './PrimitiveNode.js';
import { makeObservable } from '../reactivity/index.js';

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
    makeObservable(this, {
      _name: 'observable',
      _metadata: 'observable.ref',
      _formula: 'observable.ref',
      _defaultValue: 'observable',
      _foreignKey: 'observable',
      setName: 'action',
      setMetadata: 'action',
      setFormula: 'action',
      setDefaultValue: 'action',
      setForeignKey: 'action',
    });
  }

  nodeType(): NodeType {
    return 'boolean';
  }

  clone(): SchemaNode {
    return new BooleanNode(this.id(), this.name(), this.cloneOptions());
  }

  private cloneOptions(): BooleanNodeOptions {
    return {
      defaultValue: this._defaultValue as boolean | undefined,
      formula: this._formula,
      metadata: this._metadata,
    };
  }
}

export function createBooleanNode(
  id: string,
  name: string,
  options: BooleanNodeOptions = {},
): SchemaNode {
  return new BooleanNode(id, name, options);
}
