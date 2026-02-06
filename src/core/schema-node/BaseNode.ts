import type { SchemaNode, NodeType, NodeMetadata, Formula } from './types.js';
import { EMPTY_METADATA } from './types.js';
import { NULL_NODE } from './NullNode.js';
import { makeObservable } from '../reactivity/index.js';

export abstract class BaseNode implements SchemaNode {
  protected _name: string;
  protected _metadata: NodeMetadata;
  protected _ref: string | undefined;

  constructor(
    private readonly _id: string,
    name: string,
    metadata: NodeMetadata = EMPTY_METADATA,
    ref?: string,
  ) {
    this._name = name;
    this._metadata = metadata;
    this._ref = ref;
  }

  protected initBaseObservable(): void {
    makeObservable(this, {
      _name: 'observable',
      _metadata: 'observable.ref',
      setName: 'action',
      setMetadata: 'action',
    });
  }

  id(): string {
    return this._id;
  }

  name(): string {
    return this._name;
  }

  abstract nodeType(): NodeType;

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
    return this._ref !== undefined;
  }

  isNull(): boolean {
    return false;
  }

  property(_name: string): SchemaNode {
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

  contentMediaType(): string | undefined {
    return undefined;
  }

  abstract clone(): SchemaNode;
  abstract cloneWithId(newId: string): SchemaNode;

  setName(name: string): void {
    this._name = name;
  }

  setMetadata(metadata: NodeMetadata): void {
    this._metadata = metadata;
  }

  addChild(_node: SchemaNode): void {
    // No-op by default
  }

  insertChild(_index: number, _node: SchemaNode): void {
    // No-op by default
  }

  removeChild(_name: string): boolean {
    return false;
  }

  replaceChild(_name: string, _node: SchemaNode): boolean {
    return false;
  }

  setItems(_node: SchemaNode): void {
    // No-op by default
  }

  setDefaultValue(_value: unknown): void {
    // No-op by default
  }

  setFormula(_formula: Formula | undefined): void {
    // No-op by default
  }

  setForeignKey(_key: string | undefined): void {
    // No-op by default
  }

  setContentMediaType(_mediaType: string | undefined): void {
    // No-op by default
  }
}
