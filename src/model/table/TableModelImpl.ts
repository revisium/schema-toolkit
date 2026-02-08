import { makeAutoObservable, observable } from '../../core/reactivity/index.js';
import type { JsonObjectSchema } from '../../types/schema.types.js';
import type { ForeignKeyResolver } from '../foreign-key-resolver/ForeignKeyResolver.js';
import { createSchemaModel } from '../schema-model/SchemaModelImpl.js';
import type { SchemaModel } from '../schema-model/types.js';
import { createRowModel, RowModelImpl } from './row/RowModelImpl.js';
import type { RowModel } from './row/types.js';
import type { TableModel, TableModelOptions, RefSchemas } from './types.js';
import type { TypedTableModel, TypedTableModelOptions } from './typed.js';

export class TableModelImpl implements TableModel {
  private _tableId: string;
  private _baseTableId: string;
  private readonly _schema: SchemaModel;
  private readonly _rows: RowModel[];
  private readonly _jsonSchema: JsonObjectSchema;
  private readonly _fkResolver: ForeignKeyResolver | undefined;
  private readonly _refSchemas: RefSchemas | undefined;

  constructor(options: TableModelOptions) {
    this._tableId = options.tableId;
    this._baseTableId = options.tableId;
    this._jsonSchema = options.schema;
    this._schema = createSchemaModel(options.schema, { refSchemas: options.refSchemas });
    this._fkResolver = options.fkResolver;
    this._refSchemas = options.refSchemas;
    this._rows = observable.array<RowModel>();

    if (options.rows) {
      for (const row of options.rows) {
        this._rows.push(this.createRow(row.rowId, row.data));
      }
    }

    makeAutoObservable(this, {
      _schema: false,
      _rows: false,
      _jsonSchema: false,
      _fkResolver: false,
      _refSchemas: false,
    });
  }

  get tableId(): string {
    return this._tableId;
  }

  get baseTableId(): string {
    return this._baseTableId;
  }

  get isRenamed(): boolean {
    return this._tableId !== this._baseTableId;
  }

  get fk(): ForeignKeyResolver | undefined {
    return this._fkResolver;
  }

  get refSchemas(): RefSchemas | undefined {
    return this._refSchemas;
  }

  get schema(): SchemaModel {
    return this._schema;
  }

  get rows(): readonly RowModel[] {
    return this._rows;
  }

  get rowCount(): number {
    return this._rows.length;
  }

  rename(newTableId: string): void {
    this._tableId = newTableId;
  }

  addRow(rowId: string, data?: unknown): RowModel {
    if (this.getRow(rowId)) {
      throw new Error(`Row with id already exists: ${rowId}`);
    }
    const rowModel = this.createRow(rowId, data);
    this._rows.push(rowModel);
    return rowModel;
  }

  removeRow(rowId: string): void {
    const index = this._rows.findIndex((row) => row.rowId === rowId);
    if (index === -1) {
      return;
    }
    const row = this._rows[index];
    if (!row) {
      return;
    }
    row.dispose();
    if (row instanceof RowModelImpl) {
      row.setTableModel(null);
    }
    this._rows.splice(index, 1);
  }

  getRow(rowId: string): RowModel | undefined {
    return this._rows.find((row) => row.rowId === rowId);
  }

  getRowIndex(rowId: string): number {
    return this._rows.findIndex((row) => row.rowId === rowId);
  }

  getRowAt(index: number): RowModel | undefined {
    return this._rows[index];
  }

  get isDirty(): boolean {
    if (this.isRenamed) {
      return true;
    }

    if (this._schema.isDirty) {
      return true;
    }

    for (const row of this._rows) {
      if (row.isDirty) {
        return true;
      }
    }

    return false;
  }

  commit(): void {
    this._baseTableId = this._tableId;
    this._schema.markAsSaved();

    for (const row of this._rows) {
      row.commit();
    }
  }

  revert(): void {
    this._tableId = this._baseTableId;
    this._schema.revert();

    for (const row of this._rows) {
      row.revert();
    }
  }

  dispose(): void {
    for (const row of this._rows) {
      row.dispose();
    }
    this._rows.splice(0);
  }

  private createRow(rowId: string, data?: unknown): RowModel {
    const rowModel = createRowModel({
      rowId,
      schema: this._jsonSchema,
      data,
      fkResolver: this._fkResolver,
      refSchemas: this._refSchemas,
    });
    (rowModel as RowModelImpl).setTableModel(this);
    return rowModel;
  }
}

export function createTableModel<const S extends JsonObjectSchema>(
  options: TypedTableModelOptions<S>,
): TypedTableModel<S>;
export function createTableModel(options: TableModelOptions): TableModel;
export function createTableModel(options: TableModelOptions): TableModel {
  return new TableModelImpl(options);
}
