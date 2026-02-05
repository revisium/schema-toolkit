import type { SchemaNode, NodeType, NodeMetadata, Formula } from './types.js';
import { EMPTY_METADATA } from './types.js';

class NullNodeImpl implements SchemaNode {
  id(): string {
    return '';
  }

  name(): string {
    return '';
  }

  nodeType(): NodeType {
    return 'null';
  }

  metadata(): NodeMetadata {
    return EMPTY_METADATA;
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
    return true;
  }

  property(): SchemaNode {
    return this;
  }

  properties(): readonly SchemaNode[] {
    return [];
  }

  items(): SchemaNode {
    return this;
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

  clone(): SchemaNode {
    return this;
  }

  cloneWithId(_newId: string): SchemaNode {
    return this;
  }

  setName(_name: string): void {
    // No-op for null
  }

  setMetadata(_metadata: NodeMetadata): void {
    // No-op for null
  }

  addChild(_node: SchemaNode): void {
    // No-op for null
  }

  removeChild(_name: string): boolean {
    return false;
  }

  replaceChild(_name: string, _node: SchemaNode): boolean {
    return false;
  }

  setItems(_node: SchemaNode): void {
    // No-op for null
  }

  setDefaultValue(_value: unknown): void {
    // No-op for null
  }

  setFormula(_formula: Formula | undefined): void {
    // No-op for null
  }

  setForeignKey(_key: string | undefined): void {
    // No-op for null
  }

  contentMediaType(): string | undefined {
    return undefined;
  }

  setContentMediaType(_mediaType: string | undefined): void {
    // No-op for null
  }
}

export const NULL_NODE: SchemaNode = new NullNodeImpl();
