import { describe, it, expect } from '@jest/globals';
import { obj, str, num } from '../../../mocks/schema.mocks.js';
import type { JsonObjectSchema } from '../../../types/schema.types.js';
import { createTableModel } from '../TableModelImpl.js';

const createSimpleSchema = () =>
  obj({
    name: str(),
    age: num(),
  });

const createNestedSchema = () =>
  obj({
    name: str(),
    address: obj({
      city: str(),
    }),
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
        schema: obj({
          name: str({ default: 'Unknown' }),
          status: str({ default: 'active' }),
        }),
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

      table.schema.addField(table.schema.root.id(), 'newField', 'string');

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

  describe('dispose', () => {
    it('disposes all rows', () => {
      const table = createTableModel({
        tableId: 'users',
        schema: createSimpleSchema(),
        rows: [
          { rowId: 'user-1', data: { name: 'John', age: 30 } },
          { rowId: 'user-2', data: { name: 'Jane', age: 25 } },
        ],
      });

      table.dispose();

      expect(table.rows).toHaveLength(0);
    });

    it('does not throw on empty table', () => {
      const table = createTableModel({
        tableId: 'users',
        schema: createSimpleSchema(),
      });

      expect(() => table.dispose()).not.toThrow();
    });
  });

  describe('removeRow disposes row', () => {
    it('disposes removed row formula engine', () => {
      const table = createTableModel({
        tableId: 'users',
        schema: createSimpleSchema(),
        rows: [{ rowId: 'user-1', data: { name: 'John', age: 30 } }],
      });

      table.removeRow('user-1');

      expect(table.rows).toHaveLength(0);
    });
  });

  describe('nodeById', () => {
    it('row.nodeById finds node by id', () => {
      const table = createTableModel({
        tableId: 'users',
        schema: createSimpleSchema(),
        rows: [{ rowId: 'user-1', data: { name: 'John', age: 30 } }],
      });

      const row = table.getRow('user-1');
      expect(row).toBeDefined();

      const nameNode = row!.get('name');
      expect(nameNode).toBeDefined();

      const found = row!.nodeById(nameNode!.id);

      expect(found).toBe(nameNode);
    });

    it('row.nodeById returns undefined for unknown id', () => {
      const table = createTableModel({
        tableId: 'users',
        schema: createSimpleSchema(),
        rows: [{ rowId: 'user-1', data: { name: 'John', age: 30 } }],
      });

      const row = table.getRow('user-1');
      expect(row).toBeDefined();

      expect(row!.nodeById('unknown-id')).toBeUndefined();
    });
  });

  describe('formula integration', () => {
    it('formulas evaluate automatically on row creation', () => {
      const schema = obj({
        price: num(),
        quantity: num(),
        total: num({ formula: 'price * quantity' }),
      });

      const table = createTableModel({
        tableId: 'products',
        schema,
        rows: [{ rowId: 'p1', data: { price: 10, quantity: 3, total: 0 } }],
      });

      const row = table.getRow('p1');

      expect(row!.getValue('total')).toBe(30);
    });

    it('formulas recalculate on value change', () => {
      const schema = obj({
        price: num(),
        quantity: num(),
        total: num({ formula: 'price * quantity' }),
      });

      const table = createTableModel({
        tableId: 'products',
        schema,
      });

      const row = table.addRow('p1', { price: 10, quantity: 3, total: 0 });

      expect(row.getValue('total')).toBe(30);

      row.setValue('price', 20);

      expect(row.getValue('total')).toBe(60);
    });

    it('formulas work on addRow without data', () => {
      const schema = obj({
        a: num({ default: 5 }),
        b: num({ default: 3 }),
        sum: num({ formula: 'a + b' }),
      });

      const table = createTableModel({
        tableId: 'calc',
        schema,
      });

      const row = table.addRow('r1');

      expect(row.getValue('sum')).toBe(8);
    });
  });

  describe('patches', () => {
    it('row returns patches after changes', () => {
      const table = createTableModel({
        tableId: 'users',
        schema: createSimpleSchema(),
        rows: [{ rowId: 'user-1', data: { name: 'John', age: 30 } }],
      });

      const row = table.getRow('user-1');
      row!.setValue('name', 'Jane');

      expect(row!.patches).toEqual([
        { op: 'replace', path: '/name', value: 'Jane' },
      ]);
    });

    it('row patches clear after commit', () => {
      const table = createTableModel({
        tableId: 'users',
        schema: createSimpleSchema(),
        rows: [{ rowId: 'user-1', data: { name: 'John', age: 30 } }],
      });

      const row = table.getRow('user-1');
      row!.setValue('name', 'Jane');
      row!.commit();

      expect(row!.patches).toEqual([]);
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

  describe('refSchemas support', () => {
    const fileSchema = obj({
      fileId: str(),
      url: str(),
      fileName: str(),
    });

    const createSchemaWithRef = () =>
      obj({
        name: str(),
        avatar: { $ref: 'File' } as { $ref: string },
      });

    it('stores refSchemas in table', () => {
      const refSchemas = { File: fileSchema };
      const table = createTableModel({
        tableId: 'users',
        schema: createSchemaWithRef(),
        refSchemas,
      });

      expect(table.refSchemas).toBe(refSchemas);
    });

    it('refSchemas is undefined when not provided', () => {
      const table = createTableModel({
        tableId: 'users',
        schema: createSimpleSchema(),
      });

      expect(table.refSchemas).toBeUndefined();
    });

    it('resolves ref schema when creating row with data', () => {
      const table = createTableModel({
        tableId: 'users',
        schema: createSchemaWithRef(),
        refSchemas: { File: fileSchema },
      });

      const row = table.addRow('user-1', {
        name: 'John',
        avatar: { fileId: 'f1', url: '/img.png', fileName: 'img.png' },
      });

      expect(row.getValue('avatar.fileId')).toBe('f1');
      expect(row.getValue('avatar.url')).toBe('/img.png');
      expect(row.getValue('avatar.fileName')).toBe('img.png');
    });

    it('generates default values for ref schema when creating row without data', () => {
      const table = createTableModel({
        tableId: 'users',
        schema: createSchemaWithRef(),
        refSchemas: { File: fileSchema },
      });

      const row = table.addRow('user-1');

      expect(row.getValue('avatar.fileId')).toBe('');
      expect(row.getValue('avatar.url')).toBe('');
      expect(row.getValue('avatar.fileName')).toBe('');
    });

    it('returns empty object for ref when refSchemas not provided', () => {
      const table = createTableModel({
        tableId: 'users',
        schema: createSchemaWithRef(),
      });

      const row = table.addRow('user-1');

      expect(row.getPlainValue()).toEqual({ name: '', avatar: {} });
    });

    it('schema.generateDefaultValue is consistent with addRow default values', () => {
      const table = createTableModel({
        tableId: 'users',
        schema: createSchemaWithRef(),
        refSchemas: { File: fileSchema },
      });

      const row = table.addRow('user-1');
      const schemaDefault = table.schema.generateDefaultValue();

      expect(row.getPlainValue()).toEqual(schemaDefault);
    });

    it('schema.refSchemas matches table.refSchemas', () => {
      const refSchemas = { File: fileSchema };
      const table = createTableModel({
        tableId: 'users',
        schema: createSchemaWithRef(),
        refSchemas,
      });

      expect(table.schema.refSchemas).toBe(refSchemas);
    });
  });

  describe('untyped schema (backward compatibility)', () => {
    it('works with schema typed as JsonObjectSchema', () => {
      const schema: JsonObjectSchema = createSimpleSchema();
      const table = createTableModel({
        tableId: 'users',
        schema,
        rows: [{ rowId: 'u1', data: { name: 'Alice', age: 25 } }],
      });

      expect(table.rowCount).toBe(1);
      const row = table.getRow('u1');
      expect(row).toBeDefined();
      expect(row?.getValue('name')).toBe('Alice');
      expect(row?.getPlainValue()).toEqual({ name: 'Alice', age: 25 });
    });

    it('addRow works with untyped schema', () => {
      const schema: JsonObjectSchema = createSimpleSchema();
      const table = createTableModel({
        tableId: 'users',
        schema,
      });

      const row = table.addRow('u1', { name: 'Bob', age: 30 });

      expect(row.getValue('name')).toBe('Bob');
      expect(table.rowCount).toBe(1);
    });

    it('getRow returns undefined for missing row with untyped schema', () => {
      const schema: JsonObjectSchema = createSimpleSchema();
      const table = createTableModel({
        tableId: 'users',
        schema,
      });

      expect(table.getRow('missing')).toBeUndefined();
    });

    it('supports setValue on rows with untyped schema', () => {
      const schema: JsonObjectSchema = createSimpleSchema();
      const table = createTableModel({
        tableId: 'users',
        schema,
        rows: [{ rowId: 'u1', data: { name: 'Alice', age: 25 } }],
      });

      const row = table.getRow('u1');
      row?.setValue('age', 30);

      expect(row?.getValue('age')).toBe(30);
    });
  });
});
