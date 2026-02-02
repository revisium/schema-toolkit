import type { Formula as ParsedFormula } from '../../model/schema-formula/core/Formula.js';

export type NodeType =
  | 'object'
  | 'array'
  | 'string'
  | 'number'
  | 'boolean'
  | 'ref'
  | 'null';

export interface NodeMetadata {
  readonly title?: string;
  readonly description?: string;
  readonly deprecated?: boolean;
}

export const EMPTY_METADATA: NodeMetadata = Object.freeze({});

export type Formula = ParsedFormula;

export interface SchemaNode {
  id(): string;
  name(): string;
  nodeType(): NodeType;
  metadata(): NodeMetadata;

  isObject(): boolean;
  isArray(): boolean;
  isPrimitive(): boolean;
  isRef(): boolean;
  isNull(): boolean;

  property(name: string): SchemaNode;
  properties(): readonly SchemaNode[];
  items(): SchemaNode;

  ref(): string | undefined;
  formula(): Formula | undefined;
  hasFormula(): boolean;
  defaultValue(): unknown;
  foreignKey(): string | undefined;

  clone(): SchemaNode;

  setName(name: string): void;
  setMetadata(metadata: NodeMetadata): void;
  addChild(node: SchemaNode): void;
  removeChild(name: string): boolean;
  setItems(node: SchemaNode): void;
  setDefaultValue(value: unknown): void;
  setFormula(formula: Formula | undefined): void;
  setForeignKey(key: string | undefined): void;
}
