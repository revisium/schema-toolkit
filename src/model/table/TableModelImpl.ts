import { makeObservable, observable } from '../../core/reactivity/index.js';
import type { JsonObjectSchema, JsonSchema } from '../../types/schema.types.js';
import { generateDefaultValue } from '../default-value/index.js';
import type { ForeignKeyResolver } from '../foreign-key-resolver/ForeignKeyResolver.js';
import { createSchemaModel } from '../schema-model/SchemaModelImpl.js';
import type { SchemaModel } from '../schema-model/types.js';
import { createNodeFactory } from '../value-node/NodeFactory.js';
import { ValueTree } from '../value-tree/ValueTree.js';
import { RowModelImpl } from './row/RowModelImpl.js';
import type { RowModel } from './row/types.js';
import type { TableModel, TableModelOptions } from './types.js';

export class TableModelImpl implements TableModel {
  private _tableId: string;
  private _baseTableId: string;
  private readonly _schema: SchemaModel;
  private readonly _rows: RowModel[];
  private readonly _jsonSchema: JsonObjectSchema;
  private readonly _fkResolver: ForeignKeyResolver | undefined;

  constructor(options: TableModelOptions) {
    this._tableId = options.tableId;
    this._baseTableId = options.tableId;
    this._jsonSchema = options.schema;
    this._schema = createSchemaModel(options.schema);
    this._fkResolver = options.fkResolver;
    this._rows = observable.array<RowModel>();

    if (options.rows) {
      for (const row of options.rows) {
        this._rows.push(this.createRowModel(row.rowId, row.data));
      }
    }

    makeObservable(this, {
      _tableId: 'observable',
      _baseTableId: 'observable',
      tableId: 'computed',
      baseTableId: 'computed',
      isRenamed: 'computed',
      rows: 'computed',
      rowCount: 'computed',
      isDirty: 'computed',
      rename: 'action',
      addRow: 'action',
      removeRow: 'action',
      commit: 'action',
      revert: 'action',
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
    const rowModel = this.createRowModel(rowId, data);
    this._rows.push(rowModel);
    return rowModel;
  }

  removeRow(rowId: string): void {
    const index = this._rows.findIndex((row) => row.rowId === rowId);
    if (index !== -1) {
      const row = this._rows[index];
      if (row instanceof RowModelImpl) {
        row.setTableModel(null);
      }
      this._rows.splice(index, 1);
    }
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

  private createRowModel(rowId: string, data?: unknown): RowModel {
    const factory = createNodeFactory({
      fkResolver: this._fkResolver,
    });
    const rowData = data ?? generateDefaultValue(this._jsonSchema);
    const rootNode = factory.createTree(this._jsonSchema as JsonSchema, rowData);
    const valueTree = new ValueTree(rootNode);
    const rowModel = new RowModelImpl(rowId, valueTree);
    rowModel.setTableModel(this);
    return rowModel;
  }
}

export function createTableModel(options: TableModelOptions): TableModel {
  return new TableModelImpl(options);
}
