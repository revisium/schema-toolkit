import type { Diagnostic } from '../../../core/validation/types.js';
import type { JsonValuePatch } from '../../../types/json-value-patch.types.js';
import type { ValueNode } from '../../value-node/types.js';

export interface ValueTreeLike {
  readonly root: ValueNode;
  get(path: string): ValueNode | undefined;
  getValue(path: string): unknown;
  setValue(path: string, value: unknown): void;
  getPlainValue(): unknown;
  readonly isDirty: boolean;
  readonly isValid: boolean;
  readonly errors: readonly Diagnostic[];
  getPatches(): readonly JsonValuePatch[];
  commit(): void;
  revert(): void;
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

  readonly index: number;
  readonly prev: RowModel | null;
  readonly next: RowModel | null;

  get(path: string): ValueNode | undefined;
  getValue(path: string): unknown;
  setValue(path: string, value: unknown): void;
  getPlainValue(): unknown;

  readonly isDirty: boolean;
  readonly isValid: boolean;
  readonly errors: readonly Diagnostic[];

  getPatches(): readonly JsonValuePatch[];
  commit(): void;
  revert(): void;
}
