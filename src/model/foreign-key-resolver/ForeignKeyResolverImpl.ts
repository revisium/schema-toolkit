import { makeAutoObservable, observable, runInAction } from '../../core/reactivity/index.js';
import type {
  JsonObjectSchema,
  JsonSchema,
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
  private readonly _pendingRowLoads: Map<string, Map<string, Promise<RowData>>>;
  private _prefetchEnabled: boolean;
  private _disposed = false;

  private readonly loader: ForeignKeyLoader | undefined;

  constructor(options?: ForeignKeyResolverOptions) {
    this.loader = options?.loader;
    this._prefetchEnabled = options?.prefetch ?? false;

    this._schemaCache = observable.map<string, JsonObjectSchema>();
    this._tableCache = observable.map<string, ForeignKeyTableCache>();
    this._loadingTables = new Set();
    this._loadingRows = new Map();
    this._pendingTableLoads = new Map();
    this._pendingRowLoads = new Map();

    makeAutoObservable(this, {
      _schemaCache: false,
      _tableCache: false,
      _loadingTables: false,
      _loadingRows: false,
      _pendingTableLoads: false,
      _pendingRowLoads: false,
      _disposed: false,
      loader: false,
    });
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
    runInAction(() => {
      this._schemaCache.set(tableId, schema);
    });
  }

  addTable(tableId: string, schema: JsonObjectSchema, rows: RowData[]): void {
    if (this._disposed) {
      return;
    }

    const rowMap = observable.map<string, RowData>();
    for (const row of rows) {
      rowMap.set(row.rowId, row);
    }

    const cache: ForeignKeyTableCache = { schema, rows: rowMap };

    runInAction(() => {
      this._tableCache.set(tableId, cache);
      this._schemaCache.set(tableId, schema);
    });

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
      runInAction(() => {
        table.rows.set(rowId, rowData);
      });

      if (this._prefetchEnabled) {
        this.prefetchForeignKeysFromRow(tableId, table.schema, data);
      }
    }
  }

  renameTable(oldTableId: string, newTableId: string): void {
    if (this._disposed) {
      return;
    }

    const schema = this._schemaCache.get(oldTableId);
    const tableCache = this._tableCache.get(oldTableId);

    runInAction(() => {
      if (schema) {
        this._schemaCache.delete(oldTableId);
        this._schemaCache.set(newTableId, schema);
      }
      if (tableCache) {
        this._tableCache.delete(oldTableId);
        this._tableCache.set(newTableId, tableCache);
      }
    });
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

    const tableLoads = this._pendingRowLoads.get(tableId);
    const pending = tableLoads?.get(rowId);
    if (pending) {
      return pending;
    }

    const loadPromise = this.loadRowInternal(tableId, rowId);
    this.setPendingRowLoad(tableId, rowId, loadPromise);

    try {
      return await loadPromise;
    } finally {
      this.clearPendingRowLoad(tableId, rowId);
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

    this.markRowAsLoading(tableId, rowId);

    try {
      const result = await this.loader.loadRow(tableId, rowId);
      if (!this._disposed) {
        this.addSchema(tableId, result.schema);
        this.ensureTableCache(tableId, result.schema);
        this.addRow(tableId, rowId, result.row.data);
      }
      return result.row;
    } finally {
      this.clearRowLoading(tableId, rowId);
    }
  }

  private ensureTableCache(tableId: string, schema: JsonObjectSchema): void {
    if (!this._tableCache.has(tableId)) {
      const rowMap = observable.map<string, RowData>();
      const cache: ForeignKeyTableCache = { schema, rows: rowMap };

      runInAction(() => {
        this._tableCache.set(tableId, cache);
      });
    }
  }

  private markRowAsLoading(tableId: string, rowId: string): void {
    let rowSet = this._loadingRows.get(tableId);
    if (!rowSet) {
      rowSet = new Set();
      this._loadingRows.set(tableId, rowSet);
    }
    rowSet.add(rowId);
  }

  private clearRowLoading(tableId: string, rowId: string): void {
    const rowSet = this._loadingRows.get(tableId);
    if (rowSet) {
      rowSet.delete(rowId);
      if (rowSet.size === 0) {
        this._loadingRows.delete(tableId);
      }
    }
  }

  private setPendingRowLoad(
    tableId: string,
    rowId: string,
    promise: Promise<RowData>,
  ): void {
    let tableLoads = this._pendingRowLoads.get(tableId);
    if (!tableLoads) {
      tableLoads = new Map();
      this._pendingRowLoads.set(tableId, tableLoads);
    }
    tableLoads.set(rowId, promise);
  }

  private clearPendingRowLoad(tableId: string, rowId: string): void {
    const tableLoads = this._pendingRowLoads.get(tableId);
    if (tableLoads) {
      tableLoads.delete(rowId);
      if (tableLoads.size === 0) {
        this._pendingRowLoads.delete(tableId);
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
      if (!fk) {
        continue;
      }

      const fieldValue = dataObj[fieldName];
      if (typeof fieldValue !== 'string' || !fieldValue) {
        continue;
      }

      if (!this.hasRow(fk, fieldValue) && !this.isLoadingRow(fk, fieldValue)) {
        this.prefetchRow(fk, fieldValue);
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
    if ('type' in schema && schema.type === 'string') {
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
