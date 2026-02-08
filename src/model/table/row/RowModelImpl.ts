import { makeAutoObservable } from '../../../core/reactivity/index.js';
import type { Diagnostic } from '../../../core/validation/types.js';
import type { JsonSchema } from '../../../types/schema.types.js';
import type { JsonValuePatch } from '../../../types/json-value-patch.types.js';
import { generateDefaultValue } from '../../default-value/index.js';
import { FormulaEngine } from '../../value-formula/FormulaEngine.js';
import { createNodeFactory } from '../../value-node/NodeFactory.js';
import type { ValueNode } from '../../value-node/types.js';
import { ValueTree } from '../../value-tree/ValueTree.js';
import type { RowModel, RowModelOptions, TableModelLike, ValueTreeLike } from './types.js';
import type { TypedRowModel, TypedRowModelOptions } from './typed.js';

const UNSET_INDEX = -1;

export class RowModelImpl implements RowModel {
  private _tableModel: TableModelLike | null = null;

  constructor(
    private readonly _rowId: string,
    private readonly _tree: ValueTreeLike,
  ) {
    makeAutoObservable(this, {
      _rowId: false,
      _tree: false,
      _tableModel: 'observable.ref',
    });
  }

  get rowId(): string {
    return this._rowId;
  }

  get tableModel(): TableModelLike | null {
    return this._tableModel;
  }

  get tree(): ValueTreeLike {
    return this._tree;
  }

  get index(): number {
    if (!this._tableModel) {
      return UNSET_INDEX;
    }
    return this._tableModel.getRowIndex(this._rowId);
  }

  get prev(): RowModel | null {
    if (!this._tableModel) {
      return null;
    }
    const currentIndex = this.index;
    if (currentIndex <= 0) {
      return null;
    }
    return this._tableModel.getRowAt(currentIndex - 1) ?? null;
  }

  get next(): RowModel | null {
    if (!this._tableModel) {
      return null;
    }
    const currentIndex = this.index;
    if (currentIndex === UNSET_INDEX || currentIndex >= this._tableModel.rowCount - 1) {
      return null;
    }
    return this._tableModel.getRowAt(currentIndex + 1) ?? null;
  }

  get(path: string): ValueNode | undefined {
    return this._tree.get(path);
  }

  getValue(path: string): unknown {
    return this._tree.getValue(path);
  }

  setValue(path: string, value: unknown): void {
    this._tree.setValue(path, value);
  }

  getPlainValue(): unknown {
    return this._tree.getPlainValue();
  }

  nodeById(id: string): ValueNode | undefined {
    return this._tree.nodeById(id);
  }

  get isDirty(): boolean {
    return this._tree.isDirty;
  }

  get isValid(): boolean {
    return this._tree.isValid;
  }

  get errors(): readonly Diagnostic[] {
    return this._tree.errors;
  }

  getPatches(): readonly JsonValuePatch[] {
    return this._tree.getPatches();
  }

  commit(): void {
    this._tree.commit();
  }

  revert(): void {
    this._tree.revert();
  }

  dispose(): void {
    this._tree.dispose();
  }

  setTableModel(tableModel: TableModelLike | null): void {
    this._tableModel = tableModel;
  }
}

export function createRowModel<const S extends JsonSchema>(
  options: TypedRowModelOptions<S>,
): TypedRowModel<S>;
export function createRowModel(options: RowModelOptions): RowModel;
export function createRowModel(options: RowModelOptions): RowModel {
  const factory = createNodeFactory({
    fkResolver: options.fkResolver,
    refSchemas: options.refSchemas,
  });
  const rowData =
    options.data ?? generateDefaultValue(options.schema, { refSchemas: options.refSchemas });
  const rootNode = factory.createTree(options.schema, rowData);
  const valueTree = new ValueTree(rootNode);

  const formulaEngine = new FormulaEngine(valueTree);
  valueTree.setFormulaEngine(formulaEngine);

  return new RowModelImpl(options.rowId, valueTree);
}
