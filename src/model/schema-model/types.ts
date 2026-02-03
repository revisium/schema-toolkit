import type { NodeMetadata, SchemaNode } from '../../core/schema-node/index.js';
import type { Path } from '../../core/path/index.js';
import type { SchemaPatch, JsonPatch } from '../../core/schema-patch/index.js';
import type { JsonObjectSchema } from '../../types/index.js';
import type { SchemaValidationError } from '../../core/validation/schema/types.js';
import type { TreeFormulaValidationError } from '../../core/validation/formula/types.js';

export type FieldType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'object'
  | 'array';

export interface ReplaceResult {
  replacedNodeId: string;
  newNodeId: string;
}

export interface SchemaModel {
  readonly root: SchemaNode;
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

  wrapInArray(nodeId: string): ReplaceResult | null;
  wrapRootInArray(): ReplaceResult | null;
  replaceRoot(newType: FieldType): ReplaceResult | null;

  canMoveNode(nodeId: string, targetParentId: string): boolean;
  hasValidDropTarget(nodeId: string): boolean;

  getFormulaDependents(nodeId: string): readonly string[];
  hasFormulaDependents(nodeId: string): boolean;

  readonly validationErrors: SchemaValidationError[];
  readonly formulaErrors: TreeFormulaValidationError[];

  readonly isDirty: boolean;
  readonly isValid: boolean;

  readonly patches: SchemaPatch[];
  readonly jsonPatches: JsonPatch[];

  markAsSaved(): void;
  revert(): void;

  readonly plainSchema: JsonObjectSchema;
  readonly nodeCount: number;

  generateDefaultValue(options?: { arrayItemCount?: number }): unknown;
}
