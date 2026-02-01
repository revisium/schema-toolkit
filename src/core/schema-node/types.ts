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

export interface Formula {
  readonly version: number;
  readonly expression: string;
}

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
}
