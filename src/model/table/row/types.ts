import type { Diagnostic } from '../../../core/validation/types.js';
import type { JsonSchema } from '../../../types/schema.types.js';
import type { JsonValuePatch } from '../../../types/json-value-patch.types.js';
import type { ForeignKeyResolver } from '../../foreign-key-resolver/ForeignKeyResolver.js';
import type { RefSchemas } from '../../value-node/NodeFactory.js';
import type { ValueNode } from '../../value-node/types.js';
import type { ValueTreeLike } from '../../value-tree/types.js';

export type { ValueTreeLike };

export interface RowModelOptions {
  rowId: string;
  schema: JsonSchema;
  data?: unknown;
  fkResolver?: ForeignKeyResolver;
  refSchemas?: RefSchemas;
}

export interface TableModelLike {
  getRowIndex(rowId: string): number;
  getRowAt(index: number): RowModel | undefined;
  readonly rowCount: number;
}

export interface RowModel {
  readonly rowId: string;
  readonly tableModel: TableModelLike | null;
  readonly tree: ValueTreeLike;
  readonly root: ValueNode;

  readonly index: number;
  readonly prev: RowModel | null;
  readonly next: RowModel | null;

  get(path: string): ValueNode | undefined;
  getValue(path: string): unknown;
  setValue(path: string, value: unknown): void;
  getPlainValue(): unknown;

  nodeById(id: string): ValueNode | undefined;

  readonly isDirty: boolean;
  readonly isValid: boolean;
  readonly errors: readonly Diagnostic[];

  readonly patches: readonly JsonValuePatch[];
  commit(): void;
  revert(): void;
  reset(data?: unknown): void;
  dispose(): void;
}
