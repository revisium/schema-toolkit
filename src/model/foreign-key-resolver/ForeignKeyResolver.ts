import type { JsonObjectSchema } from '../../types/schema.types.js';
import type { RowData } from './types.js';

export interface ForeignKeyResolver {
  addSchema(tableId: string, schema: JsonObjectSchema): void;
  addTable(tableId: string, schema: JsonObjectSchema, rows: RowData[]): void;
  addRow(tableId: string, rowId: string, data: unknown): void;
  renameTable(oldTableId: string, newTableId: string): void;

  getSchema(tableId: string): Promise<JsonObjectSchema>;
  getRowData(tableId: string, rowId: string): Promise<RowData>;

  isLoading(tableId: string): boolean;
  isLoadingRow(tableId: string, rowId: string): boolean;

  hasSchema(tableId: string): boolean;
  hasTable(tableId: string): boolean;
  hasRow(tableId: string, rowId: string): boolean;

  setPrefetch(enabled: boolean): void;
  readonly isPrefetchEnabled: boolean;

  dispose(): void;
}
