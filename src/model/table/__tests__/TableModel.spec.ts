import { describe, it, expect, jest } from '@jest/globals';
import type { ReactivityAdapter } from '../../../core/reactivity/types.js';
import { JsonSchemaTypeName, type JsonObjectSchema } from '../../../types/schema.types.js';
import { createTableModel } from '../TableModelImpl.js';

const createSimpleSchema = (): JsonObjectSchema => ({
  type: JsonSchemaTypeName.Object,
  additionalProperties: false,
  required: ['name', 'age'],
  properties: {
    name: { type: JsonSchemaTypeName.String, default: '' },
    age: { type: JsonSchemaTypeName.Number, default: 0 },
  },
});

const createNestedSchema = (): JsonObjectSchema => ({
  type: JsonSchemaTypeName.Object,
  additionalProperties: false,
  required: ['name', 'address'],
  properties: {
    name: { type: JsonSchemaTypeName.String, default: '' },
    address: {
      type: JsonSchemaTypeName.Object,
      additionalProperties: false,
      required: ['city'],
      properties: {
        city: { type: JsonSchemaTypeName.String, default: '' },
      },
    },
  },
});

describe('TableModel', () => {
  describe('construction', () => {
    it('creates table with tableId and schema', () => {
      const table = createTableModel({
        tableId: 'users',
        schema: createSimpleSchema(),
      });

      expect(table.tableId).toBe('users');
      expect(table.baseTableId).toBe('users');
      expect(table.schema).toBeDefined();
    });

    it('creates table with initial rows', () => {
      const table = createTableModel({
        tableId: 'users',
        schema: createSimpleSchema(),
        rows: [
          { rowId: 'user-1', data: { name: 'John', age: 30 } },
          { rowId: 'user-2', data: { name: 'Jane', age: 25 } },
        ],
      });

      expect(table.rows).toHaveLength(2);
      expect(table.getRow('user-1')).toBeDefined();
      expect(table.getRow('user-2')).toBeDefined();
    });

    it('creates empty table when no rows provided', () => {
      const table = createTableModel({
        tableId: 'users',
        schema: createSimpleSchema(),
      });

      expect(table.rows).toHaveLength(0);
    });

    it('uses single SchemaModel for table', () => {
      const table = createTableModel({
        tableId: 'users',
        schema: createSimpleSchema(),
      });

      const row1 = table.addRow('user-1');
      const row2 = table.addRow('user-2');

      expect(table.schema).toBeDefined();
      expect(row1.tree).not.toBe(row2.tree);
    });
  });

  describe('rename', () => {
    it('rename changes tableId', () => {
      const table = createTableModel({
        tableId: 'users',
        schema: createSimpleSchema(),
      });

      table.rename('customers');

      expect(table.tableId).toBe('customers');
    });

    it('isRenamed returns true after rename', () => {
      const table = createTableModel({
        tableId: 'users',
        schema: createSimpleSchema(),
      });

      expect(table.isRenamed).toBe(false);

      table.rename('customers');

      expect(table.isRenamed).toBe(true);
    });

    it('baseTableId preserves original name', () => {
      const table = createTableModel({
        tableId: 'users',
        schema: createSimpleSchema(),
      });

      table.rename('customers');

      expect(table.baseTableId).toBe('users');
      expect(table.tableId).toBe('customers');
    });
  });

  describe('rows', () => {
    it('addRow creates new RowModel', () => {
      const table = createTableModel({
        tableId: 'users',
        schema: createSimpleSchema(),
      });

      const row = table.addRow('user-1');

      expect(row).toBeDefined();
      expect(row.rowId).toBe('user-1');
      expect(table.rows).toHaveLength(1);
    });

    it('addRow with data initializes values', () => {
      const table = createTableModel({
        tableId: 'users',
        schema: createSimpleSchema(),
      });

      const row = table.addRow('user-1', { name: 'John', age: 30 });

      expect(row.getPlainValue()).toEqual({ name: 'John', age: 30 });
    });

    it('addRow throws for duplicate rowId', () => {
      const table = createTableModel({
        tableId: 'users',
        schema: createSimpleSchema(),
      });

      table.addRow('user-1');

      expect(() => table.addRow('user-1')).toThrow('Row with id already exists: user-1');
    });

    it('addRow without data generates defaults from schema', () => {
      const table = createTableModel({
        tableId: 'users',
        schema: createSimpleSchema(),
      });

      const row = table.addRow('user-1');

      expect(row.getPlainValue()).toEqual({ name: '', age: 0 });
    });

    it('addRow without data uses schema defaults', () => {
      const table = createTableModel({
        tableId: 'users',
        schema: {
          type: JsonSchemaTypeName.Object,
          additionalProperties: false,
          required: ['name', 'status'],
          properties: {
            name: { type: JsonSchemaTypeName.String, default: 'Unknown' },
            status: { type: JsonSchemaTypeName.String, default: 'active' },
          },
        },
      });

      const row = table.addRow('user-1');

      expect(row.getPlainValue()).toEqual({ name: 'Unknown', status: 'active' });
    });

    it('removeRow removes row by id', () => {
      const table = createTableModel({
        tableId: 'users',
        schema: createSimpleSchema(),
        rows: [{ rowId: 'user-1', data: { name: 'John', age: 30 } }],
      });

      table.removeRow('user-1');

      expect(table.rows).toHaveLength(0);
      expect(table.getRow('user-1')).toBeUndefined();
    });

    it('removeRow does nothing for non-existent id', () => {
      const table = createTableModel({
        tableId: 'users',
        schema: createSimpleSchema(),
        rows: [{ rowId: 'user-1', data: { name: 'John', age: 30 } }],
      });

      table.removeRow('user-999');

      expect(table.rows).toHaveLength(1);
    });

    it('getRow returns row or undefined', () => {
      const table = createTableModel({
        tableId: 'users',
        schema: createSimpleSchema(),
        rows: [{ rowId: 'user-1', data: { name: 'John', age: 30 } }],
      });

      expect(table.getRow('user-1')).toBeDefined();
      expect(table.getRow('user-999')).toBeUndefined();
    });

    it('getRowIndex returns correct index', () => {
      const table = createTableModel({
        tableId: 'users',
        schema: createSimpleSchema(),
        rows: [
          { rowId: 'user-1', data: { name: 'John', age: 30 } },
          { rowId: 'user-2', data: { name: 'Jane', age: 25 } },
        ],
      });

      expect(table.getRowIndex('user-1')).toBe(0);
      expect(table.getRowIndex('user-2')).toBe(1);
      expect(table.getRowIndex('user-999')).toBe(-1);
    });

    it('getRowAt returns row by index', () => {
      const table = createTableModel({
        tableId: 'users',
        schema: createSimpleSchema(),
        rows: [
          { rowId: 'user-1', data: { name: 'John', age: 30 } },
          { rowId: 'user-2', data: { name: 'Jane', age: 25 } },
        ],
      });

      expect(table.getRowAt(0)?.rowId).toBe('user-1');
      expect(table.getRowAt(1)?.rowId).toBe('user-2');
      expect(table.getRowAt(2)).toBeUndefined();
    });

    it('rowCount returns number of rows', () => {
      const table = createTableModel({
        tableId: 'users',
        schema: createSimpleSchema(),
        rows: [
          { rowId: 'user-1', data: { name: 'John', age: 30 } },
          { rowId: 'user-2', data: { name: 'Jane', age: 25 } },
        ],
      });

      expect(table.rowCount).toBe(2);
    });
  });

  describe('dirty tracking', () => {
    it('isDirty false initially', () => {
      const table = createTableModel({
        tableId: 'users',
        schema: createSimpleSchema(),
      });

      expect(table.isDirty).toBe(false);
    });

    it('isDirty true after rename', () => {
      const table = createTableModel({
        tableId: 'users',
        schema: createSimpleSchema(),
      });

      table.rename('customers');

      expect(table.isDirty).toBe(true);
    });

    it('isDirty true if schema dirty', () => {
      const table = createTableModel({
        tableId: 'users',
        schema: createSimpleSchema(),
      });

      table.schema.addField(table.schema.root().id(), 'newField', 'string');

      expect(table.isDirty).toBe(true);
    });

    it('isDirty true if any row dirty', () => {
      const table = createTableModel({
        tableId: 'users',
        schema: createSimpleSchema(),
        rows: [{ rowId: 'user-1', data: { name: 'John', age: 30 } }],
      });

      const row = table.getRow('user-1');
      expect(row).toBeDefined();
      row!.setValue('name', 'Jane');

      expect(table.isDirty).toBe(true);
    });

    it('commit resets dirty for all', () => {
      const table = createTableModel({
        tableId: 'users',
        schema: createSimpleSchema(),
        rows: [{ rowId: 'user-1', data: { name: 'John', age: 30 } }],
      });

      table.rename('customers');
      const row = table.getRow('user-1');
      row!.setValue('name', 'Jane');

      table.commit();

      expect(table.isDirty).toBe(false);
      expect(table.isRenamed).toBe(false);
      expect(table.tableId).toBe('customers');
      expect(table.baseTableId).toBe('customers');
    });

    it('revert reverts all changes', () => {
      const table = createTableModel({
        tableId: 'users',
        schema: createSimpleSchema(),
        rows: [{ rowId: 'user-1', data: { name: 'John', age: 30 } }],
      });

      table.rename('customers');
      const row = table.getRow('user-1');
      row!.setValue('name', 'Jane');

      table.revert();

      expect(table.isDirty).toBe(false);
      expect(table.isRenamed).toBe(false);
      expect(table.tableId).toBe('users');
      expect(row!.getValue('name')).toBe('John');
    });
  });

  describe('row navigation', () => {
    it('rows have navigation after adding to table', () => {
      const table = createTableModel({
        tableId: 'users',
        schema: createSimpleSchema(),
      });

      const row1 = table.addRow('user-1');
      const row2 = table.addRow('user-2');
      const row3 = table.addRow('user-3');

      expect(row1.index).toBe(0);
      expect(row2.index).toBe(1);
      expect(row3.index).toBe(2);

      expect(row1.prev).toBeNull();
      expect(row1.next).toBe(row2);

      expect(row2.prev).toBe(row1);
      expect(row2.next).toBe(row3);

      expect(row3.prev).toBe(row2);
      expect(row3.next).toBeNull();
    });

    it('rows lose navigation after removal', () => {
      const table = createTableModel({
        tableId: 'users',
        schema: createSimpleSchema(),
      });

      const row = table.addRow('user-1');
      expect(row.index).toBe(0);

      table.removeRow('user-1');
      expect(row.index).toBe(-1);
    });
  });

  describe('nested schema support', () => {
    it('supports nested schema', () => {
      const table = createTableModel({
        tableId: 'users',
        schema: createNestedSchema(),
      });
      const row = table.addRow('user-1', {
        name: 'John',
        address: { city: 'NYC' },
      });

      expect(row.getValue('address.city')).toBe('NYC');
    });
  });

  describe('reactivity', () => {
    it('calls makeObservable when adapter provided', () => {
      const makeObservableMock = jest.fn();
      const mockAdapter: ReactivityAdapter = {
        makeObservable: makeObservableMock,
        observableArray: <T>() => [] as T[],
        observableMap: <K, V>() => new Map<K, V>(),
        reaction: () => () => {},
        runInAction: <T>(fn: () => T) => fn(),
      };

      createTableModel(
        {
          tableId: 'users',
          schema: createSimpleSchema(),
        },
        mockAdapter,
      );

      expect(makeObservableMock).toHaveBeenCalled();
    });
  });
});
