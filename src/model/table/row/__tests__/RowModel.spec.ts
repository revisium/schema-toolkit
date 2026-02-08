import { describe, it, expect, beforeEach } from '@jest/globals';
import type { Diagnostic } from '../../../../core/validation/types.js';
import type { ValuePath } from '../../../../core/value-path/types.js';
import { EMPTY_VALUE_PATH } from '../../../../core/value-path/ValuePath.js';
import { obj, str, num, bool, arr, numFormula } from '../../../../mocks/schema.mocks.js';
import type { JsonValuePatch } from '../../../../types/json-value-patch.types.js';
import type { JsonSchema, JsonObjectSchema } from '../../../../types/schema.types.js';
import type { ValueNode } from '../../../value-node/types.js';
import { createRowModel, RowModelImpl } from '../RowModelImpl.js';
import type { RowModel, TableModelLike, ValueTreeLike } from '../types.js';

class MockValueTree implements ValueTreeLike {
  root = {} as ValueNode;
  isDirty = false;
  isValid = true;
  errors: readonly Diagnostic[] = [];

  private _getResult: ValueNode | undefined = undefined;
  private _getValueResult: unknown = undefined;
  private _plainValue: unknown = {};
  private _patches: readonly JsonValuePatch[] = [];

  getCalls: string[] = [];
  getValueCalls: string[] = [];
  setValueCalls: Array<{ path: string; value: unknown }> = [];
  getPlainValueCalls = 0;
  getPatchesCalls = 0;
  commitCalls = 0;
  revertCalls = 0;
  disposeCalls = 0;
  nodeByIdCalls: string[] = [];

  setGetResult(result: ValueNode | undefined): void {
    this._getResult = result;
  }

  setGetValueResult(result: unknown): void {
    this._getValueResult = result;
  }

  setPlainValue(value: unknown): void {
    this._plainValue = value;
  }

  setPatches(patches: readonly JsonValuePatch[]): void {
    this._patches = patches;
  }

  get(path: string): ValueNode | undefined {
    this.getCalls.push(path);
    return this._getResult;
  }

  getValue(path: string): unknown {
    this.getValueCalls.push(path);
    return this._getValueResult;
  }

  setValue(path: string, value: unknown): void {
    this.setValueCalls.push({ path, value });
  }

  getPlainValue(): unknown {
    this.getPlainValueCalls++;
    return this._plainValue;
  }

  getPatches(): readonly JsonValuePatch[] {
    this.getPatchesCalls++;
    return this._patches;
  }

  commit(): void {
    this.commitCalls++;
  }

  revert(): void {
    this.revertCalls++;
  }

  nodeById(id: string): ValueNode | undefined {
    this.nodeByIdCalls.push(id);
    return undefined;
  }

  pathOf(_nodeOrId: ValueNode | string): ValuePath {
    return EMPTY_VALUE_PATH;
  }

  dispose(): void {
    this.disposeCalls++;
  }
}

class MockTableModel implements TableModelLike {
  private _rows: RowModel[] = [];
  private _getRowAtOverride?: (index: number) => RowModel | undefined;

  constructor(rows: RowModel[] = []) {
    this._rows = rows;
  }

  get rowCount(): number {
    return this._rows.length;
  }

  getRowIndex(rowId: string): number {
    return this._rows.findIndex((r) => r.rowId === rowId);
  }

  getRowAt(index: number): RowModel | undefined {
    if (this._getRowAtOverride) {
      return this._getRowAtOverride(index);
    }
    return this._rows[index];
  }

  setGetRowAtOverride(fn: (index: number) => RowModel | undefined): void {
    this._getRowAtOverride = fn;
  }
}

describe('RowModelImpl', () => {
  let mockTree: MockValueTree;

  beforeEach(() => {
    mockTree = new MockValueTree();
  });

  describe('construction', () => {
    it('creates row with rowId and tree', () => {
      const row = new RowModelImpl('row-1', mockTree);

      expect(row.rowId).toBe('row-1');
      expect(row.tree).toBe(mockTree);
    });

    it('creates row without tableModel by default', () => {
      const row = new RowModelImpl('row-1', mockTree);

      expect(row.tableModel).toBeNull();
    });
  });

  describe('navigation without tableModel', () => {
    it('returns -1 for index when no tableModel', () => {
      const row = new RowModelImpl('row-1', mockTree);

      expect(row.index).toBe(-1);
    });

    it('returns null for prev when no tableModel', () => {
      const row = new RowModelImpl('row-1', mockTree);

      expect(row.prev).toBeNull();
    });

    it('returns null for next when no tableModel', () => {
      const row = new RowModelImpl('row-1', mockTree);

      expect(row.next).toBeNull();
    });
  });

  describe('navigation with tableModel', () => {
    it('returns correct index from tableModel', () => {
      const row = new RowModelImpl('row-2', mockTree);
      const mockTable = new MockTableModel([
        { rowId: 'row-1' } as RowModel,
        row,
        { rowId: 'row-3' } as RowModel,
      ]);

      row.setTableModel(mockTable);

      expect(row.index).toBe(1);
    });

    it('returns prev row when exists', () => {
      const prevRow = { rowId: 'row-1' } as RowModel;
      const row = new RowModelImpl('row-2', mockTree);
      const mockTable = new MockTableModel([prevRow, row]);

      row.setTableModel(mockTable);

      expect(row.prev).toBe(prevRow);
    });

    it('returns null for prev when first row', () => {
      const row = new RowModelImpl('row-1', mockTree);
      const mockTable = new MockTableModel([row, { rowId: 'row-2' } as RowModel]);

      row.setTableModel(mockTable);

      expect(row.prev).toBeNull();
    });

    it('returns next row when exists', () => {
      const nextRow = { rowId: 'row-2' } as RowModel;
      const row = new RowModelImpl('row-1', mockTree);
      const mockTable = new MockTableModel([row, nextRow]);

      row.setTableModel(mockTable);

      expect(row.next).toBe(nextRow);
    });

    it('returns null for next when last row', () => {
      const row = new RowModelImpl('row-2', mockTree);
      const mockTable = new MockTableModel([{ rowId: 'row-1' } as RowModel, row]);

      row.setTableModel(mockTable);

      expect(row.next).toBeNull();
    });

    it('returns null for next when row not found in table', () => {
      const row = new RowModelImpl('row-unknown', mockTree);
      const mockTable = new MockTableModel([{ rowId: 'row-1' } as RowModel]);

      row.setTableModel(mockTable);

      expect(row.next).toBeNull();
    });
  });

  describe('value operations delegation', () => {
    it('delegates get to tree', () => {
      const mockNode = { id: 'node-1' } as ValueNode;
      mockTree.setGetResult(mockNode);
      const row = new RowModelImpl('row-1', mockTree);

      const result = row.get('name');

      expect(mockTree.getCalls).toContain('name');
      expect(result).toBe(mockNode);
    });

    it('delegates getValue to tree', () => {
      mockTree.setGetValueResult('John');
      const row = new RowModelImpl('row-1', mockTree);

      const result = row.getValue('name');

      expect(mockTree.getValueCalls).toContain('name');
      expect(result).toBe('John');
    });

    it('delegates setValue to tree', () => {
      const row = new RowModelImpl('row-1', mockTree);

      row.setValue('name', 'Jane');

      expect(mockTree.setValueCalls).toContainEqual({ path: 'name', value: 'Jane' });
    });

    it('delegates getPlainValue to tree', () => {
      const plainValue = { name: 'John', age: 25 };
      mockTree.setPlainValue(plainValue);
      const row = new RowModelImpl('row-1', mockTree);

      const result = row.getPlainValue();

      expect(mockTree.getPlainValueCalls).toBe(1);
      expect(result).toBe(plainValue);
    });
  });

  describe('state delegation', () => {
    it('delegates isDirty to tree', () => {
      mockTree.isDirty = true;
      const row = new RowModelImpl('row-1', mockTree);

      expect(row.isDirty).toBe(true);
    });

    it('delegates isValid to tree', () => {
      mockTree.isValid = false;
      const row = new RowModelImpl('row-1', mockTree);

      expect(row.isValid).toBe(false);
    });

    it('delegates errors to tree', () => {
      const errors: Diagnostic[] = [
        { severity: 'error', type: 'required', message: 'Required', path: 'name' },
      ];
      mockTree.errors = errors;
      const row = new RowModelImpl('row-1', mockTree);

      expect(row.errors).toBe(errors);
    });
  });

  describe('patch operations delegation', () => {
    it('delegates getPatches to tree', () => {
      const patches: JsonValuePatch[] = [{ op: 'replace', path: '/name', value: 'Jane' }];
      mockTree.setPatches(patches);
      const row = new RowModelImpl('row-1', mockTree);

      const result = row.getPatches();

      expect(mockTree.getPatchesCalls).toBe(1);
      expect(result).toBe(patches);
    });

    it('delegates commit to tree', () => {
      const row = new RowModelImpl('row-1', mockTree);

      row.commit();

      expect(mockTree.commitCalls).toBe(1);
    });

    it('delegates revert to tree', () => {
      const row = new RowModelImpl('row-1', mockTree);

      row.revert();

      expect(mockTree.revertCalls).toBe(1);
    });
  });

  describe('setTableModel', () => {
    it('sets tableModel', () => {
      const row = new RowModelImpl('row-1', mockTree);
      const mockTable = new MockTableModel([row]);

      row.setTableModel(mockTable);

      expect(row.tableModel).toBe(mockTable);
    });

    it('clears tableModel when set to null', () => {
      const row = new RowModelImpl('row-1', mockTree);
      const mockTable = new MockTableModel([row]);

      row.setTableModel(mockTable);
      row.setTableModel(null);

      expect(row.tableModel).toBeNull();
    });

    it('updates navigation after setting tableModel', () => {
      const row = new RowModelImpl('row-1', mockTree);

      expect(row.index).toBe(-1);

      const mockTable = new MockTableModel([row]);
      row.setTableModel(mockTable);

      expect(row.index).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('handles empty table for navigation', () => {
      const row = new RowModelImpl('row-1', mockTree);
      const mockTable = new MockTableModel([]);

      row.setTableModel(mockTable);

      expect(row.index).toBe(-1);
      expect(row.prev).toBeNull();
      expect(row.next).toBeNull();
    });

    it('handles single row in table', () => {
      const row = new RowModelImpl('row-1', mockTree);
      const mockTable = new MockTableModel([row]);

      row.setTableModel(mockTable);

      expect(row.index).toBe(0);
      expect(row.prev).toBeNull();
      expect(row.next).toBeNull();
    });

    it('handles row at middle of table', () => {
      const prevRow = { rowId: 'row-1' } as RowModel;
      const nextRow = { rowId: 'row-3' } as RowModel;
      const row = new RowModelImpl('row-2', mockTree);
      const mockTable = new MockTableModel([prevRow, row, nextRow]);

      row.setTableModel(mockTable);

      expect(row.index).toBe(1);
      expect(row.prev).toBe(prevRow);
      expect(row.next).toBe(nextRow);
    });

    it('returns null for prev when getRowAt returns undefined', () => {
      const row = new RowModelImpl('row-2', mockTree);
      const mockTable = new MockTableModel([
        { rowId: 'row-1' } as RowModel,
        row,
      ]);
      mockTable.setGetRowAtOverride(() => undefined);

      row.setTableModel(mockTable);

      expect(row.prev).toBeNull();
    });

    it('returns null for next when getRowAt returns undefined', () => {
      const row = new RowModelImpl('row-1', mockTree);
      const mockTable = new MockTableModel([
        row,
        { rowId: 'row-2' } as RowModel,
      ]);
      mockTable.setGetRowAtOverride(() => undefined);

      row.setTableModel(mockTable);

      expect(row.next).toBeNull();
    });
  });
});

describe('createRowModel', () => {
  const schema = obj({
    name: str(),
    age: num(),
  });

  it('creates row with given data', () => {
    const row = createRowModel({
      rowId: 'row-1',
      schema,
      data: { name: 'John', age: 30 },
    });

    expect(row.rowId).toBe('row-1');
    expect(row.getValue('name')).toBe('John');
    expect(row.getValue('age')).toBe(30);
  });

  it('creates row with default values when no data', () => {
    const row = createRowModel({ rowId: 'row-1', schema });

    expect(row.getPlainValue()).toEqual({ name: '', age: 0 });
  });

  it('has no tableModel by default', () => {
    const row = createRowModel({ rowId: 'row-1', schema });

    expect(row.tableModel).toBeNull();
    expect(row.index).toBe(-1);
  });

  it('supports setValue and dirty tracking', () => {
    const row = createRowModel({
      rowId: 'row-1',
      schema,
      data: { name: 'John', age: 30 },
    });

    expect(row.isDirty).toBe(false);

    row.setValue('name', 'Jane');

    expect(row.isDirty).toBe(true);
    expect(row.getValue('name')).toBe('Jane');
  });

  it('generates patches after changes', () => {
    const row = createRowModel({
      rowId: 'row-1',
      schema,
      data: { name: 'John', age: 30 },
    });

    row.setValue('name', 'Jane');

    expect(row.getPatches()).toEqual([
      { op: 'replace', path: '/name', value: 'Jane' },
    ]);
  });

  it('supports nodeById', () => {
    const row = createRowModel({
      rowId: 'row-1',
      schema,
      data: { name: 'John', age: 30 },
    });

    const nameNode = row.get('name');
    expect(nameNode).toBeDefined();

    const found = row.nodeById(nameNode!.id);
    expect(found).toBe(nameNode);
  });

  it('supports commit and revert', () => {
    const row = createRowModel({
      rowId: 'row-1',
      schema,
      data: { name: 'John', age: 30 },
    });

    row.setValue('name', 'Jane');
    row.commit();

    expect(row.isDirty).toBe(false);
    expect(row.getValue('name')).toBe('Jane');
    expect(row.getPatches()).toEqual([]);
  });

  it('supports dispose', () => {
    const row = createRowModel({
      rowId: 'row-1',
      schema,
      data: { name: 'John', age: 30 },
    });

    expect(() => row.dispose()).not.toThrow();
  });

  it('evaluates formulas automatically', () => {
    const formulaSchema = obj({
      firstName: str(),
      lastName: str(),
      fullName: str({ formula: 'firstName + " " + lastName' }),
    });

    const row = createRowModel({
      rowId: 'row-1',
      schema: formulaSchema,
      data: { firstName: 'John', lastName: 'Doe', fullName: '' },
    });

    expect(row.getValue('fullName')).toBe('John Doe');
  });

  describe('formula patches', () => {
    it('does not produce patches after init with formulas', () => {
      const schema = obj({
        price: num(),
        quantity: num(),
        total: numFormula('price * quantity'),
      });

      const row = createRowModel({
        rowId: 'row-1',
        schema,
        data: { price: 10, quantity: 5, total: 0 },
      });

      expect(row.getValue('total')).toBe(50);
      expect(row.getPatches()).toEqual([]);
    });

    it('is not dirty after init with formulas', () => {
      const schema = obj({
        price: num(),
        quantity: num(),
        total: numFormula('price * quantity'),
      });

      const row = createRowModel({
        rowId: 'row-1',
        schema,
        data: { price: 10, quantity: 5, total: 0 },
      });

      expect(row.getValue('total')).toBe(50);
      expect(row.isDirty).toBe(false);
    });

    it('does not include formula fields in patches when dependency changes', () => {
      const schema = obj({
        price: num(),
        quantity: num(),
        total: numFormula('price * quantity'),
      });

      const row = createRowModel({
        rowId: 'row-1',
        schema,
        data: { price: 10, quantity: 5, total: 0 },
      });

      row.setValue('price', 20);

      expect(row.getValue('total')).toBe(100);
      const patches = row.getPatches();
      expect(patches).toEqual([{ op: 'replace', path: '/price', value: 20 }]);
    });

    it('does not include chained formula fields in patches', () => {
      const schema = obj({
        price: num(),
        quantity: num(),
        subtotal: numFormula('price * quantity'),
        tax: numFormula('subtotal * 0.1'),
        total: numFormula('subtotal + tax'),
      });

      const row = createRowModel({
        rowId: 'row-1',
        schema,
        data: { price: 100, quantity: 2, subtotal: 0, tax: 0, total: 0 },
      });

      expect(row.getValue('subtotal')).toBe(200);
      expect(row.getValue('tax')).toBe(20);
      expect(row.getValue('total')).toBe(220);
      expect(row.getPatches()).toEqual([]);

      row.setValue('quantity', 3);

      expect(row.getValue('subtotal')).toBe(300);
      expect(row.getValue('tax')).toBe(30);
      expect(row.getValue('total')).toBe(330);
      const patches = row.getPatches();
      expect(patches).toEqual([{ op: 'replace', path: '/quantity', value: 3 }]);
    });

    it('formula node isDirty is always false even when value changes', () => {
      const schema = obj({
        a: num(),
        b: numFormula('a * 2'),
      });

      const row = createRowModel({
        rowId: 'row-1',
        schema,
        data: { a: 5, b: 0 },
      });

      const bNode = row.get('b');
      expect(bNode).not.toBeUndefined();

      expect(row.getValue('b')).toBe(10);
      expect(bNode!.isDirty).toBe(false);
      expect(row.isDirty).toBe(false);

      row.setValue('a', 10);

      expect(row.getValue('b')).toBe(20);
      expect(bNode!.isDirty).toBe(false);
      expect(row.isDirty).toBe(true);

      row.commit();

      expect(bNode!.isDirty).toBe(false);
      expect(row.isDirty).toBe(false);
    });

    it('formula field isDirty is false after commit', () => {
      const schema = obj({
        a: num(),
        b: numFormula('a * 2'),
      });

      const row = createRowModel({
        rowId: 'row-1',
        schema,
        data: { a: 5, b: 0 },
      });

      row.setValue('a', 10);
      expect(row.getValue('b')).toBe(20);

      row.commit();

      expect(row.isDirty).toBe(false);
      expect(row.getPatches()).toEqual([]);
    });
  });

  it('re-evaluates formulas on dependency change', () => {
    const formulaSchema = obj({
      firstName: str(),
      lastName: str(),
      fullName: str({ formula: 'firstName + " " + lastName' }),
    });

    const row = createRowModel({
      rowId: 'row-1',
      schema: formulaSchema,
      data: { firstName: 'John', lastName: 'Doe', fullName: '' },
    });

    row.setValue('firstName', 'Jane');

    expect(row.getValue('fullName')).toBe('Jane Doe');
  });

  describe('non-object root schemas', () => {
    it('creates row with string schema and default value', () => {
      const row = createRowModel({ rowId: 'row-1', schema: str() });

      expect(row.getPlainValue()).toBe('');
    });

    it('creates row with string schema and given data', () => {
      const row = createRowModel({ rowId: 'row-1', schema: str(), data: 'hello' });

      expect(row.getPlainValue()).toBe('hello');
    });

    it('supports setValue on string root', () => {
      const row = createRowModel({ rowId: 'row-1', schema: str(), data: 'hello' });

      expect(row.isDirty).toBe(false);

      row.tree.setValue('', 'world');

      expect(row.isDirty).toBe(true);
      expect(row.getPlainValue()).toBe('world');
    });

    it('creates row with number schema and default value', () => {
      const row = createRowModel({ rowId: 'row-1', schema: num() });

      expect(row.getPlainValue()).toBe(0);
    });

    it('creates row with number schema and given data', () => {
      const row = createRowModel({ rowId: 'row-1', schema: num(), data: 42 });

      expect(row.getPlainValue()).toBe(42);
    });

    it('creates row with boolean schema and default value', () => {
      const row = createRowModel({ rowId: 'row-1', schema: bool() });

      expect(row.getPlainValue()).toBe(false);
    });

    it('creates row with boolean schema and given data', () => {
      const row = createRowModel({ rowId: 'row-1', schema: bool(), data: true });

      expect(row.getPlainValue()).toBe(true);
    });

    it('creates row with array schema and default value', () => {
      const row = createRowModel({ rowId: 'row-1', schema: arr(str()) });

      expect(row.getPlainValue()).toEqual([]);
    });

    it('creates row with array schema and given data', () => {
      const row = createRowModel({ rowId: 'row-1', schema: arr(str()), data: ['a', 'b'] });

      expect(row.getPlainValue()).toEqual(['a', 'b']);
    });

    it('supports commit on string root', () => {
      const row = createRowModel({ rowId: 'row-1', schema: str(), data: 'hello' });

      row.tree.setValue('', 'world');
      row.commit();

      expect(row.isDirty).toBe(false);
      expect(row.getPlainValue()).toBe('world');
    });

    it('supports revert on string root', () => {
      const row = createRowModel({ rowId: 'row-1', schema: str(), data: 'hello' });

      row.tree.setValue('', 'world');
      row.revert();

      expect(row.isDirty).toBe(false);
      expect(row.getPlainValue()).toBe('hello');
    });

    it('supports dispose on non-object root', () => {
      const row = createRowModel({ rowId: 'row-1', schema: str(), data: 'hello' });

      expect(() => row.dispose()).not.toThrow();
    });
  });

  describe('untyped schema (backward compatibility)', () => {
    it('works with schema typed as JsonObjectSchema', () => {
      const schema: JsonObjectSchema = obj({ name: str(), age: num() });
      const row = createRowModel({
        rowId: 'row-1',
        schema,
        data: { name: 'John', age: 30 },
      });

      expect(row.getValue('name')).toBe('John');
      expect(row.getValue('age')).toBe(30);
      expect(row.getPlainValue()).toEqual({ name: 'John', age: 30 });
    });

    it('works with schema typed as JsonSchema', () => {
      const schema: JsonSchema = obj({ title: str() });
      const row = createRowModel({
        rowId: 'row-1',
        schema,
        data: { title: 'Test' },
      });

      expect(row.getValue('title')).toBe('Test');
      expect(row.getPlainValue()).toEqual({ title: 'Test' });
    });

    it('supports setValue with untyped schema', () => {
      const schema: JsonObjectSchema = obj({ count: num() });
      const row = createRowModel({
        rowId: 'row-1',
        schema,
        data: { count: 1 },
      });

      row.setValue('count', 42);

      expect(row.getValue('count')).toBe(42);
    });

    it('supports get with untyped schema', () => {
      const schema: JsonObjectSchema = obj({ flag: bool() });
      const row = createRowModel({
        rowId: 'row-1',
        schema,
        data: { flag: true },
      });

      const node = row.get('flag');
      expect(node).toBeDefined();
    });

    it('supports commit and revert with untyped schema', () => {
      const schema: JsonObjectSchema = obj({ value: str() });
      const row = createRowModel({
        rowId: 'row-1',
        schema,
        data: { value: 'original' },
      });

      row.setValue('value', 'changed');
      expect(row.isDirty).toBe(true);

      row.revert();
      expect(row.isDirty).toBe(false);
      expect(row.getValue('value')).toBe('original');
    });
  });
});
