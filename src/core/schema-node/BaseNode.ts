import type { SchemaNode, NodeType, NodeMetadata, Formula } from './types.js';
import { EMPTY_METADATA } from './types.js';
import { NULL_NODE } from './NullNode.js';

export abstract class BaseNode implements SchemaNode {
  protected _name: string;
  protected _metadata: NodeMetadata;

  constructor(
    private readonly _id: string,
    name: string,
    metadata: NodeMetadata = EMPTY_METADATA,
  ) {
    this._name = name;
    this._metadata = metadata;
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
    return false;
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
    return undefined;
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

  abstract clone(): SchemaNode;

  setName(name: string): void {
    this._name = name;
  }

  setMetadata(metadata: NodeMetadata): void {
    this._metadata = metadata;
  }

  addChild(_node: SchemaNode): void {
    // No-op by default
  }

  removeChild(_name: string): boolean {
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
}
