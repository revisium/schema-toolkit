import type { SchemaNode, NodeType, NodeMetadata, Formula } from './types.js';
import { EMPTY_METADATA } from './types.js';
import { BaseNode } from './BaseNode.js';
import { makeObservable } from '../reactivity/index.js';

export interface PrimitiveNodeOptions {
  readonly defaultValue?: unknown;
  readonly foreignKey?: string;
  readonly formula?: Formula;
  readonly metadata?: NodeMetadata;
  readonly ref?: string;
}

export abstract class PrimitiveNode extends BaseNode {
  protected _defaultValue: unknown;
  protected _foreignKey: string | undefined;
  protected _formula: Formula | undefined;

  constructor(
    id: string,
    name: string,
    options: PrimitiveNodeOptions = {},
  ) {
    super(id, name, options.metadata ?? EMPTY_METADATA, options.ref);
    this._defaultValue = options.defaultValue;
    this._foreignKey = options.foreignKey;
    this._formula = options.formula;
  }

  protected initPrimitiveObservable(): void {
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

  abstract nodeType(): NodeType;

  isPrimitive(): boolean {
    return true;
  }

  formula(): Formula | undefined {
    return this._formula;
  }

  hasFormula(): boolean {
    return this._formula !== undefined;
  }

  defaultValue(): unknown {
    return this._defaultValue;
  }

  foreignKey(): string | undefined {
    return this._foreignKey;
  }

  abstract clone(): SchemaNode;

  setDefaultValue(value: unknown): void {
    this._defaultValue = value;
  }

  setFormula(formula: Formula | undefined): void {
    this._formula = formula;
  }

  setForeignKey(key: string | undefined): void {
    this._foreignKey = key;
  }
}
