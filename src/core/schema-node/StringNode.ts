import type { SchemaNode, NodeType, NodeMetadata, Formula } from './types.js';
import type { ContentMediaType } from '../../types/index.js';
import { PrimitiveNode } from './PrimitiveNode.js';
import { makeObservable } from '../reactivity/index.js';

export interface StringNodeOptions {
  readonly defaultValue?: string;
  readonly foreignKey?: string;
  readonly formula?: Formula;
  readonly metadata?: NodeMetadata;
  readonly contentMediaType?: ContentMediaType;
}

export class StringNode extends PrimitiveNode {
  private _contentMediaType: ContentMediaType | undefined;

  constructor(
    id: string,
    name: string,
    options: StringNodeOptions = {},
  ) {
    super(id, name, options);
    this._contentMediaType = options.contentMediaType;
    makeObservable(this, {
      _name: 'observable',
      _metadata: 'observable.ref',
      _formula: 'observable.ref',
      _defaultValue: 'observable',
      _foreignKey: 'observable',
      _contentMediaType: 'observable',
      setName: 'action',
      setMetadata: 'action',
      setFormula: 'action',
      setDefaultValue: 'action',
      setForeignKey: 'action',
      setContentMediaType: 'action',
    });
  }

  nodeType(): NodeType {
    return 'string';
  }

  contentMediaType(): ContentMediaType | undefined {
    return this._contentMediaType;
  }

  setContentMediaType(mediaType: ContentMediaType | undefined): void {
    this._contentMediaType = mediaType;
  }

  clone(): SchemaNode {
    return new StringNode(this.id(), this.name(), this.cloneOptions());
  }

  private cloneOptions(): StringNodeOptions {
    return {
      defaultValue: this._defaultValue as string | undefined,
      foreignKey: this._foreignKey,
      formula: this._formula,
      metadata: this._metadata,
      contentMediaType: this._contentMediaType,
    };
  }
}

export function createStringNode(
  id: string,
  name: string,
  options: StringNodeOptions = {},
): SchemaNode {
  return new StringNode(id, name, options);
}
