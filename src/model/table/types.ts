import type { SchemaModel } from '../schema-model/types.js';
import type { JsonObjectSchema } from '../../types/schema.types.js';
import type { ForeignKeyResolver } from '../foreign-key-resolver/ForeignKeyResolver.js';
import type { RowModel } from './row/types.js';
import type { RefSchemas } from '../value-node/NodeFactory.js';

export type { RefSchemas };

export interface RowData {
  rowId: string;
  data: unknown;
}

export interface TableModelOptions {
  tableId: string;
  schema: JsonObjectSchema;
  rows?: RowData[];
  fkResolver?: ForeignKeyResolver;
  refSchemas?: RefSchemas;
}

export interface TableModel {
  readonly fk: ForeignKeyResolver | undefined;
  readonly refSchemas: RefSchemas | undefined;
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
  dispose(): void;
}
