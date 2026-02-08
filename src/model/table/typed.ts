import type { JsonObjectSchema } from '../../types/schema.types.js';
import type { InferValue } from '../../types/typed.js';
import type { TypedRowModel } from './row/typed.js';
import type { TableModel, TableModelOptions } from './types.js';

export interface TypedRowData<S> {
  rowId: string;
  data: InferValue<S>;
}

export interface TypedTableModel<S> extends TableModel {
  readonly rows: readonly TypedRowModel<S>[];
  addRow(rowId: string, data?: InferValue<S>): TypedRowModel<S>;
  getRow(rowId: string): TypedRowModel<S> | undefined;
  getRowAt(index: number): TypedRowModel<S> | undefined;
}

export interface TypedTableModelOptions<S extends JsonObjectSchema>
  extends Omit<TableModelOptions, 'schema' | 'rows'> {
  schema: S;
  rows?: TypedRowData<S>[];
}
