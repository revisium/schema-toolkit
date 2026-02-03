import type { SchemaModel } from '../schema-model/types.js';
import type { JsonObjectSchema } from '../../types/schema.types.js';
import type { RowModel } from './row/types.js';

export interface RowData {
  rowId: string;
  data: unknown;
}

export interface TableModelOptions {
  tableId: string;
  schema: JsonObjectSchema;
  rows?: RowData[];
}

export interface TableModel {
  readonly tableId: string;
  readonly baseTableId: string;
  readonly isRenamed: boolean;

  rename(newTableId: string): void;

  readonly schema: SchemaModel;

  readonly rows: readonly RowModel[];
  readonly rowCount: number;
  addRow(rowId: string, data?: unknown): RowModel;
  removeRow(rowId: string): void;
  getRow(rowId: string): RowModel | undefined;
  getRowIndex(rowId: string): number;
  getRowAt(index: number): RowModel | undefined;

  readonly isDirty: boolean;
  commit(): void;
  revert(): void;
}
