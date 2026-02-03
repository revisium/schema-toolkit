import type { ReactivityAdapter } from '../../core/reactivity/types.js';
import type { AnnotationsMap } from '../../core/types/index.js';
import {
  JsonSchemaTypeName,
  type JsonObjectSchema,
  type JsonSchema,
} from '../../types/schema.types.js';
import {
  ForeignKeyNotFoundError,
  ForeignKeyResolverNotConfiguredError,
} from './errors.js';
import type { ForeignKeyResolver } from './ForeignKeyResolver.js';
import type {
  ForeignKeyLoader,
  ForeignKeyResolverOptions,
  ForeignKeyTableCache,
  RowData,
} from './types.js';

export class ForeignKeyResolverImpl implements ForeignKeyResolver {
  private readonly _schemaCache: Map<string, JsonObjectSchema>;
  private readonly _tableCache: Map<string, ForeignKeyTableCache>;
  private readonly _loadingTables: Set<string>;
  private readonly _loadingRows: Map<string, Set<string>>;
  private readonly _pendingTableLoads: Map<string, Promise<JsonObjectSchema>>;
  private readonly _pendingRowLoads: Map<string, Promise<RowData>>;
  private _prefetchEnabled: boolean;
  private _disposed = false;

  private readonly loader: ForeignKeyLoader | undefined;
  private readonly reactivity: ReactivityAdapter | undefined;

  constructor(options?: ForeignKeyResolverOptions) {
    this.loader = options?.loader;
    this.reactivity = options?.reactivity;
    this._prefetchEnabled = options?.prefetch ?? false;

    this._schemaCache = this.reactivity?.observableMap() ?? new Map();
    this._tableCache = this.reactivity?.observableMap() ?? new Map();
    this._loadingTables = new Set();
    this._loadingRows = new Map();
    this._pendingTableLoads = new Map();
    this._pendingRowLoads = new Map();

    this.initObservable();
  }

  private initObservable(): void {
    this.reactivity?.makeObservable(this, {
      _schemaCache: 'observable',
      _tableCache: 'observable',
      _prefetchEnabled: 'observable',
      isPrefetchEnabled: 'computed',
      addSchema: 'action',
      addTable: 'action',
      addRow: 'action',
      setPrefetch: 'action',
    } as AnnotationsMap<this>);
  }

  get isPrefetchEnabled(): boolean {
    return this._prefetchEnabled;
  }

  setPrefetch(enabled: boolean): void {
    this._prefetchEnabled = enabled;
  }

  hasSchema(tableId: string): boolean {
    return this._schemaCache.has(tableId) || this._tableCache.has(tableId);
  }

  hasTable(tableId: string): boolean {
    return this._tableCache.has(tableId);
  }

  hasRow(tableId: string, rowId: string): boolean {
    const table = this._tableCache.get(tableId);
    return table?.rows.has(rowId) ?? false;
  }

  isLoading(tableId: string): boolean {
    return this._loadingTables.has(tableId);
  }

  isLoadingRow(tableId: string, rowId: string): boolean {
    const rowSet = this._loadingRows.get(tableId);
    return rowSet?.has(rowId) ?? false;
  }

  addSchema(tableId: string, schema: JsonObjectSchema): void {
    if (this._disposed) {
      return;
    }
    if (this.reactivity) {
      this.reactivity.runInAction(() => {
        this._schemaCache.set(tableId, schema);
      });
    } else {
      this._schemaCache.set(tableId, schema);
    }
  }

  addTable(tableId: string, schema: JsonObjectSchema, rows: RowData[]): void {
    if (this._disposed) {
      return;
    }

    const rowMap: Map<string, RowData> =
      this.reactivity?.observableMap() ?? new Map();
    for (const row of rows) {
      rowMap.set(row.rowId, row);
    }

    const cache: ForeignKeyTableCache = { schema, rows: rowMap };

    if (this.reactivity) {
      this.reactivity.runInAction(() => {
        this._tableCache.set(tableId, cache);
        this._schemaCache.set(tableId, schema);
      });
    } else {
      this._tableCache.set(tableId, cache);
      this._schemaCache.set(tableId, schema);
    }

    if (this._prefetchEnabled) {
      this.prefetchForeignKeysFromTable(tableId, schema, rows);
    }
  }

  addRow(tableId: string, rowId: string, data: unknown): void {
    if (this._disposed) {
      return;
    }

    const table = this._tableCache.get(tableId);
    if (table) {
      const rowData: RowData = { rowId, data };
      if (this.reactivity) {
        this.reactivity.runInAction(() => {
          table.rows.set(rowId, rowData);
        });
      } else {
        table.rows.set(rowId, rowData);
      }

      if (this._prefetchEnabled) {
        this.prefetchForeignKeysFromRow(tableId, table.schema, data);
      }
    }
  }

  async getSchema(tableId: string): Promise<JsonObjectSchema> {
    const cachedSchema = this._schemaCache.get(tableId);
    if (cachedSchema) {
      return cachedSchema;
    }

    const cachedTable = this._tableCache.get(tableId);
    if (cachedTable) {
      return cachedTable.schema;
    }

    if (!this.loader) {
      throw new ForeignKeyNotFoundError(tableId);
    }

    const pending = this._pendingTableLoads.get(tableId);
    if (pending) {
      return pending;
    }

    const loadPromise = this.loadSchemaInternal(tableId);
    this._pendingTableLoads.set(tableId, loadPromise);

    try {
      return await loadPromise;
    } finally {
      this._pendingTableLoads.delete(tableId);
    }
  }

  async getRowData(tableId: string, rowId: string): Promise<RowData> {
    const table = this._tableCache.get(tableId);
    if (table) {
      const row = table.rows.get(rowId);
      if (row) {
        return row;
      }
    }

    if (!this.loader) {
      throw new ForeignKeyNotFoundError(tableId, rowId);
    }

    const pendingKey = `${tableId}:${rowId}`;
    const pending = this._pendingRowLoads.get(pendingKey);
    if (pending) {
      return pending;
    }

    const loadPromise = this.loadRowInternal(tableId, rowId);
    this._pendingRowLoads.set(pendingKey, loadPromise);

    try {
      return await loadPromise;
    } finally {
      this._pendingRowLoads.delete(pendingKey);
    }
  }

  dispose(): void {
    this._disposed = true;
    this._schemaCache.clear();
    this._tableCache.clear();
    this._loadingTables.clear();
    this._loadingRows.clear();
    this._pendingTableLoads.clear();
    this._pendingRowLoads.clear();
  }

  private async loadSchemaInternal(tableId: string): Promise<JsonObjectSchema> {
    if (!this.loader) {
      throw new ForeignKeyResolverNotConfiguredError();
    }

    this._loadingTables.add(tableId);

    try {
      const schema = await this.loader.loadSchema(tableId);
      if (!this._disposed) {
        this.addSchema(tableId, schema);
      }
      return schema;
    } finally {
      this._loadingTables.delete(tableId);
    }
  }

  private async loadRowInternal(
    tableId: string,
    rowId: string,
  ): Promise<RowData> {
    if (!this.loader) {
      throw new ForeignKeyResolverNotConfiguredError();
    }

    this.setRowLoading(tableId, rowId, true);

    try {
      const result = await this.loader.loadRow(tableId, rowId);
      if (!this._disposed) {
        this.addSchema(tableId, result.schema);
        this.ensureTableCache(tableId, result.schema);
        this.addRow(tableId, rowId, result.row.data);
      }
      return result.row;
    } finally {
      this.setRowLoading(tableId, rowId, false);
    }
  }

  private ensureTableCache(tableId: string, schema: JsonObjectSchema): void {
    if (!this._tableCache.has(tableId)) {
      const rowMap: Map<string, RowData> =
        this.reactivity?.observableMap() ?? new Map();
      const cache: ForeignKeyTableCache = { schema, rows: rowMap };

      if (this.reactivity) {
        this.reactivity.runInAction(() => {
          this._tableCache.set(tableId, cache);
        });
      } else {
        this._tableCache.set(tableId, cache);
      }
    }
  }

  private setRowLoading(
    tableId: string,
    rowId: string,
    loading: boolean,
  ): void {
    if (loading) {
      let rowSet = this._loadingRows.get(tableId);
      if (!rowSet) {
        rowSet = new Set();
        this._loadingRows.set(tableId, rowSet);
      }
      rowSet.add(rowId);
    } else {
      const rowSet = this._loadingRows.get(tableId);
      if (rowSet) {
        rowSet.delete(rowId);
        if (rowSet.size === 0) {
          this._loadingRows.delete(tableId);
        }
      }
    }
  }

  private prefetchForeignKeysFromTable(
    sourceTableId: string,
    schema: JsonObjectSchema,
    rows: RowData[],
  ): void {
    for (const row of rows) {
      this.prefetchForeignKeysFromRow(sourceTableId, schema, row.data);
    }
  }

  private prefetchForeignKeysFromRow(
    _sourceTableId: string,
    schema: JsonObjectSchema,
    data: unknown,
  ): void {
    const foreignKeys = this.extractForeignKeys(schema);
    if (foreignKeys.length === 0) {
      return;
    }

    const dataObj = data as Record<string, unknown>;
    const properties = schema.properties;

    for (const [fieldName, fieldSchema] of Object.entries(properties)) {
      const fk = this.getForeignKeyFromSchema(fieldSchema);
      if (fk && dataObj[fieldName]) {
        const rowId = String(dataObj[fieldName]);
        if (!this.hasRow(fk, rowId) && !this.isLoadingRow(fk, rowId)) {
          this.prefetchRow(fk, rowId);
        }
      }
    }
  }

  private prefetchRow(tableId: string, rowId: string): void {
    if (!this.loader) {
      return;
    }

    const prefetchPromise = this.getRowData(tableId, rowId);
    prefetchPromise.catch(() => {
      // Prefetch errors are silently ignored
    });
  }

  private extractForeignKeys(schema: JsonObjectSchema): string[] {
    const foreignKeys: string[] = [];
    for (const fieldSchema of Object.values(schema.properties)) {
      const fk = this.getForeignKeyFromSchema(fieldSchema);
      if (fk) {
        foreignKeys.push(fk);
      }
    }
    return foreignKeys;
  }

  private getForeignKeyFromSchema(schema: JsonSchema): string | undefined {
    if ('type' in schema && schema.type === JsonSchemaTypeName.String) {
      return schema.foreignKey;
    }
    return undefined;
  }
}

export function createForeignKeyResolver(
  options?: ForeignKeyResolverOptions,
): ForeignKeyResolver {
  return new ForeignKeyResolverImpl(options);
}
