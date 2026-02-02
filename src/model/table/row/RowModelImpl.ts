import type { ReactivityAdapter } from '../../../core/reactivity/types.js';
import type { AnnotationsMap } from '../../../core/types/index.js';
import type { Diagnostic } from '../../../core/validation/types.js';
import type { JsonValuePatch } from '../../../types/json-value-patch.types.js';
import type { ValueNode } from '../../value-node/types.js';
import type { RowModel, TableModelLike, ValueTreeLike } from './types.js';

const UNSET_INDEX = -1;

export class RowModelImpl implements RowModel {
  private _tableModel: TableModelLike | null = null;

  constructor(
    private readonly _rowId: string,
    private readonly _tree: ValueTreeLike,
    private readonly _reactivity?: ReactivityAdapter,
  ) {
    this.initObservable();
  }

  private initObservable(): void {
    this._reactivity?.makeObservable(this, {
      _tableModel: 'observable.ref',
      index: 'computed',
      prev: 'computed',
      next: 'computed',
      isDirty: 'computed',
      isValid: 'computed',
      errors: 'computed',
    } as AnnotationsMap<this>);
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

  setTableModel(tableModel: TableModelLike | null): void {
    this._tableModel = tableModel;
  }
}
