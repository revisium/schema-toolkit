import type { ReactivityAdapter } from '../../core/reactivity/types.js';
import type { AnnotationsMap } from '../../core/types/index.js';
import type { JsonObjectSchema } from '../../types/schema.types.js';
import type { ForeignKeyResolver } from '../foreign-key-resolver/ForeignKeyResolver.js';
import { createForeignKeyResolver } from '../foreign-key-resolver/ForeignKeyResolverImpl.js';
import { createTableModel } from '../table/TableModelImpl.js';
import type { RowData, TableModel } from '../table/types.js';
import type { DataModel } from './DataModel.js';
import type { DataModelOptions } from './types.js';

export class DataModelImpl implements DataModel {
  private readonly _tables: Map<string, TableModel>;
  private readonly _fk: ForeignKeyResolver;
  private readonly _ownsFkResolver: boolean;
  private readonly _reactivity: ReactivityAdapter | undefined;

  constructor(options?: DataModelOptions) {
    this._reactivity = options?.reactivity;
    this._tables = this._reactivity?.observableMap() ?? new Map();

    if (options?.fkResolver) {
      this._fk = options.fkResolver;
      this._ownsFkResolver = false;
    } else {
      this._fk = createForeignKeyResolver({ reactivity: this._reactivity });
      this._ownsFkResolver = true;
    }

    this.initObservable();
  }

  private initObservable(): void {
    this._reactivity?.makeObservable(this, {
      _tables: 'observable',
      tables: 'computed',
      tableIds: 'computed',
      isDirty: 'computed',
      addTable: 'action',
      removeTable: 'action',
      commit: 'action',
      revert: 'action',
    } as AnnotationsMap<this>);
  }

  get fk(): ForeignKeyResolver {
    return this._fk;
  }

  get tables(): readonly TableModel[] {
    return Array.from(this._tables.values());
  }

  get tableIds(): readonly string[] {
    return Array.from(this._tables.keys());
  }

  get isDirty(): boolean {
    for (const table of this._tables.values()) {
      if (table.isDirty) {
        return true;
      }
    }
    return false;
  }

  hasTable(tableId: string): boolean {
    return this._tables.has(tableId);
  }

  getTable(tableId: string): TableModel | undefined {
    return this._tables.get(tableId);
  }

  addTable(tableId: string, schema: JsonObjectSchema, rows?: RowData[]): TableModel {
    const tableModel = createTableModel(
      {
        tableId,
        schema,
        rows,
        fkResolver: this._fk,
      },
      this._reactivity,
    );

    this._tables.set(tableId, tableModel);

    this._fk.addSchema(tableId, schema);
    if (rows && rows.length > 0) {
      this._fk.addTable(tableId, schema, rows);
    }

    return tableModel;
  }

  removeTable(tableId: string): void {
    this._tables.delete(tableId);
  }

  commit(): void {
    for (const table of this._tables.values()) {
      table.commit();
    }
  }

  revert(): void {
    for (const table of this._tables.values()) {
      table.revert();
    }
  }

  dispose(): void {
    this._tables.clear();
    if (this._ownsFkResolver) {
      this._fk.dispose();
    }
  }
}

export function createDataModel(options?: DataModelOptions): DataModel {
  return new DataModelImpl(options);
}
