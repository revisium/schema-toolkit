import type { SchemaNode } from '../../core/schema-node/index.js';
import type { RefSchemas } from '../schema-model/types.js';

export type PrimitiveTypeName = 'string' | 'number' | 'boolean';
export type CompositeTypeName = 'object' | 'array';
export type SimpleFieldType = PrimitiveTypeName | CompositeTypeName;

export interface FieldSchemaSpec {
  type?: SimpleFieldType;
  $ref?: string;
  default?: unknown;
  title?: string;
  description?: string;
  deprecated?: boolean;
  foreignKey?: string;
  'x-formula'?: { expression: string };
}

export type FieldTypeSpec = SimpleFieldType | FieldSchemaSpec;

export interface TransformContext {
  sourceNode: SchemaNode;
  targetSpec: FieldSchemaSpec;
  refSchemas?: RefSchemas;
}

export interface TransformResult {
  node: SchemaNode;
}

export interface TypeTransformer {
  canTransform(ctx: TransformContext): boolean;
  transform(ctx: TransformContext): TransformResult;
}
