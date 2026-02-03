import type { JsonObjectSchema } from '../../types/schema.types.js';
import type { ForeignKeyResolver } from '../foreign-key-resolver/ForeignKeyResolver.js';
import type { RowData, TableModel } from '../table/types.js';

export interface DataModel {
  readonly fk: ForeignKeyResolver;

  addTable(tableId: string, schema: JsonObjectSchema, rows?: RowData[]): TableModel;
  getTable(tableId: string): TableModel | undefined;
  removeTable(tableId: string): void;
  hasTable(tableId: string): boolean;

  readonly tables: readonly TableModel[];
  readonly tableIds: readonly string[];

  readonly isDirty: boolean;

  commit(): void;
  revert(): void;
  dispose(): void;
}
