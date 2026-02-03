import type { ReactivityAdapter } from '../../core/reactivity/types.js';
import type { JsonObjectSchema, JsonSchema } from '../../types/schema.types.js';
import type { RowData } from '../table/types.js';

export type { RowData } from '../table/types.js';

export interface ForeignKeyLoaderResult {
  schema: JsonObjectSchema;
  rows: RowData[];
}

export interface ForeignKeyRowLoaderResult {
  schema: JsonObjectSchema;
  row: RowData;
}

export interface ForeignKeyLoader {
  loadSchema(tableId: string): Promise<JsonObjectSchema>;
  loadTable(tableId: string): Promise<ForeignKeyLoaderResult>;
  loadRow(tableId: string, rowId: string): Promise<ForeignKeyRowLoaderResult>;
}

export interface ForeignKeyResolverOptions {
  reactivity?: ReactivityAdapter;
  loader?: ForeignKeyLoader;
  prefetch?: boolean;
  prefetchDepth?: 1;
}

export interface ForeignKeyTableCache {
  schema: JsonObjectSchema;
  rows: Map<string, RowData>;
}

export type ForeignKeySchemaExtractor = (schema: JsonSchema) => string[];
