import type { SchemaNode, NodeType, NodeMetadata, Formula } from './types.js';
import { EMPTY_METADATA } from './types.js';
import { NULL_NODE } from './NullNode.js';

export interface PrimitiveNodeOptions {
  readonly defaultValue?: unknown;
  readonly foreignKey?: string;
  readonly formula?: Formula;
  readonly metadata?: NodeMetadata;
}

export abstract class PrimitiveNode implements SchemaNode {
  constructor(
    private readonly _id: string,
    private readonly _name: string,
    protected readonly _options: PrimitiveNodeOptions = {},
  ) {}

  id(): string {
    return this._id;
  }

  name(): string {
    return this._name;
  }

  abstract nodeType(): NodeType;

  metadata(): NodeMetadata {
    return this._options.metadata ?? EMPTY_METADATA;
  }

  isObject(): boolean {
    return false;
  }

  isArray(): boolean {
    return false;
  }

  isPrimitive(): boolean {
    return true;
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
    return [];
  }

  items(): SchemaNode {
    return NULL_NODE;
  }

  ref(): string | undefined {
    return undefined;
  }

  formula(): Formula | undefined {
    return this._options.formula;
  }

  hasFormula(): boolean {
    return this._options.formula !== undefined;
  }

  defaultValue(): unknown {
    return this._options.defaultValue;
  }

  foreignKey(): string | undefined {
    return this._options.foreignKey;
  }

  abstract clone(): SchemaNode;
}
