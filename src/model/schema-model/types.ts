import type { ReactivityAdapter } from '../../core/reactivity/index.js';
import type { NodeMetadata, SchemaNode } from '../../core/schema-node/index.js';
import type { Path } from '../../core/path/index.js';
import type { SchemaPatch, JsonPatch } from '../../core/schema-patch/index.js';
import type { JsonObjectSchema } from '../../types/index.js';

export interface ReactivityOptions {
  reactivity?: ReactivityAdapter;
}

export type FieldType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'object'
  | 'array';

export interface SchemaModel {
  root(): SchemaNode;
  nodeById(id: string): SchemaNode;
  pathOf(id: string): Path;

  addField(parentId: string, name: string, type: FieldType): SchemaNode;
  removeField(nodeId: string): boolean;
  renameField(nodeId: string, newName: string): void;
  changeFieldType(nodeId: string, newType: FieldType): SchemaNode;
  updateMetadata(nodeId: string, meta: Partial<NodeMetadata>): void;
  updateFormula(nodeId: string, expression: string | undefined): void;
  updateForeignKey(nodeId: string, foreignKey: string | undefined): void;
  updateDefaultValue(nodeId: string, value: unknown): void;

  isDirty(): boolean;
  isValid(): boolean;

  getPatches(): SchemaPatch[];
  getJsonPatches(): JsonPatch[];

  markAsSaved(): void;
  revert(): void;

  getPlainSchema(): JsonObjectSchema;

  generateDefaultValue(options?: { arrayItemCount?: number }): unknown;
}
