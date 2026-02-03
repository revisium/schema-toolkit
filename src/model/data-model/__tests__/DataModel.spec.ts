import { describe, it, expect } from '@jest/globals';
import { JsonSchemaTypeName, type JsonObjectSchema } from '../../../types/schema.types.js';
import { createForeignKeyResolver } from '../../foreign-key-resolver/ForeignKeyResolverImpl.js';
import { createDataModel } from '../DataModelImpl.js';

const createSimpleSchema = (): JsonObjectSchema => ({
  type: JsonSchemaTypeName.Object,
  additionalProperties: false,
  required: ['name'],
  properties: {
    name: { type: JsonSchemaTypeName.String, default: '' },
  },
});

const createSchemaWithFK = (): JsonObjectSchema => ({
  type: JsonSchemaTypeName.Object,
  additionalProperties: false,
  required: ['name', 'categoryId'],
  properties: {
    name: { type: JsonSchemaTypeName.String, default: '' },
    categoryId: { type: JsonSchemaTypeName.String, default: '', foreignKey: 'categories' },
  },
});

describe('DataModel', () => {
  describe('table management', () => {
    it('addTable creates TableModel', () => {
      const dataModel = createDataModel();

      const table = dataModel.addTable('users', createSimpleSchema());

      expect(table).toBeDefined();
      expect(table.tableId).toBe('users');
      expect(dataModel.hasTable('users')).toBe(true);
    });

    it('addTable adds schema to fk resolver', () => {
      const dataModel = createDataModel();

      dataModel.addTable('users', createSimpleSchema());

      expect(dataModel.fk.hasSchema('users')).toBe(true);
    });

    it('addTable with rows adds rows to fk resolver', () => {
      const dataModel = createDataModel();

      dataModel.addTable('users', createSimpleSchema(), [
        { rowId: 'user-1', data: { name: 'John' } },
      ]);

      expect(dataModel.fk.hasRow('users', 'user-1')).toBe(true);
    });

    it('getTable returns TableModel or undefined', () => {
      const dataModel = createDataModel();
      dataModel.addTable('users', createSimpleSchema());

      expect(dataModel.getTable('users')).toBeDefined();
      expect(dataModel.getTable('unknown')).toBeUndefined();
    });

    it('hasTable checks table existence', () => {
      const dataModel = createDataModel();
      dataModel.addTable('users', createSimpleSchema());

      expect(dataModel.hasTable('users')).toBe(true);
      expect(dataModel.hasTable('unknown')).toBe(false);
    });

    it('removeTable removes TableModel but not from fk cache', () => {
      const dataModel = createDataModel();
      dataModel.addTable('users', createSimpleSchema(), [
        { rowId: 'user-1', data: { name: 'John' } },
      ]);

      dataModel.removeTable('users');

      expect(dataModel.hasTable('users')).toBe(false);
      expect(dataModel.fk.hasSchema('users')).toBe(true);
      expect(dataModel.fk.hasRow('users', 'user-1')).toBe(true);
    });

    it('tables returns all TableModels', () => {
      const dataModel = createDataModel();
      dataModel.addTable('users', createSimpleSchema());
      dataModel.addTable('products', createSimpleSchema());

      expect(dataModel.tables).toHaveLength(2);
    });

    it('tableIds returns all table ids', () => {
      const dataModel = createDataModel();
      dataModel.addTable('users', createSimpleSchema());
      dataModel.addTable('products', createSimpleSchema());

      expect(dataModel.tableIds).toContain('users');
      expect(dataModel.tableIds).toContain('products');
    });

    it('renameTable updates internal map key', () => {
      const dataModel = createDataModel();
      dataModel.addTable('users', createSimpleSchema());

      dataModel.renameTable('users', 'customers');

      expect(dataModel.hasTable('users')).toBe(false);
      expect(dataModel.hasTable('customers')).toBe(true);
      expect(dataModel.getTable('customers')?.tableId).toBe('customers');
    });

    it('renameTable updates tableIds', () => {
      const dataModel = createDataModel();
      dataModel.addTable('users', createSimpleSchema());

      dataModel.renameTable('users', 'customers');

      expect(dataModel.tableIds).not.toContain('users');
      expect(dataModel.tableIds).toContain('customers');
    });

    it('renameTable does nothing for non-existent table', () => {
      const dataModel = createDataModel();
      dataModel.addTable('users', createSimpleSchema());

      dataModel.renameTable('unknown', 'customers');

      expect(dataModel.tableIds).toContain('users');
      expect(dataModel.tableIds).not.toContain('customers');
    });
  });

  describe('fk integration', () => {
    it('created TableModels have fk resolver', () => {
      const dataModel = createDataModel();
      const table = dataModel.addTable('users', createSimpleSchema());

      expect(table.fk).toBe(dataModel.fk);
    });

    it('uses provided fkResolver', () => {
      const fkResolver = createForeignKeyResolver();
      const dataModel = createDataModel({ fkResolver });

      expect(dataModel.fk).toBe(fkResolver);
    });

    it('creates internal fkResolver when not provided', () => {
      const dataModel = createDataModel();

      expect(dataModel.fk).toBeDefined();
    });
  });

  describe('dirty tracking', () => {
    it('isDirty false initially', () => {
      const dataModel = createDataModel();
      dataModel.addTable('users', createSimpleSchema());

      expect(dataModel.isDirty).toBe(false);
    });

    it('isDirty true if any table dirty', () => {
      const dataModel = createDataModel();
      const table = dataModel.addTable('users', createSimpleSchema());
      const row = table.addRow('user-1', { name: 'John' });

      row.setValue('name', 'Jane');

      expect(dataModel.isDirty).toBe(true);
    });

    it('commit commits all tables', () => {
      const dataModel = createDataModel();
      const table = dataModel.addTable('users', createSimpleSchema());
      const row = table.addRow('user-1', { name: 'John' });

      row.setValue('name', 'Jane');
      dataModel.commit();

      expect(dataModel.isDirty).toBe(false);
      expect(row.getValue('name')).toBe('Jane');
    });

    it('revert reverts all tables', () => {
      const dataModel = createDataModel();
      const table = dataModel.addTable('users', createSimpleSchema());
      const row = table.addRow('user-1', { name: 'John' });

      row.setValue('name', 'Jane');
      dataModel.revert();

      expect(dataModel.isDirty).toBe(false);
      expect(row.getValue('name')).toBe('John');
    });
  });

  describe('dispose', () => {
    it('dispose clears tables', () => {
      const dataModel = createDataModel();
      dataModel.addTable('users', createSimpleSchema());
      dataModel.addTable('products', createSimpleSchema());

      dataModel.dispose();

      expect(dataModel.hasTable('users')).toBe(false);
      expect(dataModel.hasTable('products')).toBe(false);
    });

    it('dispose disposes internal fk resolver', () => {
      const dataModel = createDataModel();
      dataModel.addTable('users', createSimpleSchema());

      dataModel.dispose();

      expect(dataModel.fk.hasSchema('users')).toBe(false);
    });

    it('dispose does not dispose external fk resolver', () => {
      const fkResolver = createForeignKeyResolver();
      fkResolver.addSchema('external', createSimpleSchema());

      const dataModel = createDataModel({ fkResolver });
      dataModel.addTable('users', createSimpleSchema());

      dataModel.dispose();

      expect(fkResolver.hasSchema('external')).toBe(true);
    });
  });

  describe('FK value node integration', () => {
    it('creates ForeignKeyValueNode for FK fields', () => {
      const dataModel = createDataModel();
      const table = dataModel.addTable('products', createSchemaWithFK());
      const row = table.addRow('prod-1', { name: 'iPhone', categoryId: 'cat-1' });

      const categoryNode = row.get('categoryId');
      expect(categoryNode).toBeDefined();
      expect('foreignKey' in categoryNode!).toBe(true);
    });
  });
});
