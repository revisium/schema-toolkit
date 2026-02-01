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
}

export const NULL_NODE: SchemaNode = new NullNodeImpl();
