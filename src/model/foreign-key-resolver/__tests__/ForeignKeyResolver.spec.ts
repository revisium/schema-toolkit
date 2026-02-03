import { describe, it, expect } from '@jest/globals';
import { JsonSchemaTypeName, type JsonObjectSchema } from '../../../types/schema.types.js';
import { createForeignKeyResolver } from '../ForeignKeyResolverImpl.js';
import { ForeignKeyNotFoundError } from '../errors.js';
import type { ForeignKeyLoader, RowData } from '../types.js';

const createSimpleSchema = (): JsonObjectSchema => ({
  type: JsonSchemaTypeName.Object,
  additionalProperties: false,
  required: ['name'],
  properties: {
    name: { type: JsonSchemaTypeName.String, default: '' },
  },
});

function createMockLoader(overrides: Partial<ForeignKeyLoader> = {}): ForeignKeyLoader & {
  loadSchemaCallCount: number;
  loadTableCallCount: number;
  loadRowCallCount: number;
  loadRowCalls: Array<{ tableId: string; rowId: string }>;
} {
  const loader = {
    loadSchemaCallCount: 0,
    loadTableCallCount: 0,
    loadRowCallCount: 0,
    loadRowCalls: [] as Array<{ tableId: string; rowId: string }>,
    loadSchema: async (tableId: string) => {
      loader.loadSchemaCallCount++;
      if (overrides.loadSchema) {
        return overrides.loadSchema(tableId);
      }
      throw new Error('loadSchema not implemented');
    },
    loadTable: async (tableId: string) => {
      loader.loadTableCallCount++;
      if (overrides.loadTable) {
        return overrides.loadTable(tableId);
      }
      throw new Error('loadTable not implemented');
    },
    loadRow: async (tableId: string, rowId: string) => {
      loader.loadRowCallCount++;
      loader.loadRowCalls.push({ tableId, rowId });
      if (overrides.loadRow) {
        return overrides.loadRow(tableId, rowId);
      }
      throw new Error('loadRow not implemented');
    },
  };
  return loader;
}

describe('ForeignKeyResolver', () => {
  describe('without loader (cache only)', () => {
    it('addSchema stores schema in cache', () => {
      const resolver = createForeignKeyResolver();
      const schema = createSimpleSchema();

      resolver.addSchema('users', schema);

      expect(resolver.hasSchema('users')).toBe(true);
    });

    it('getSchema returns cached schema', async () => {
      const resolver = createForeignKeyResolver();
      const schema = createSimpleSchema();

      resolver.addSchema('users', schema);

      const result = await resolver.getSchema('users');
      expect(result).toBe(schema);
    });

    it('addTable stores table with schema and rows', () => {
      const resolver = createForeignKeyResolver();
      const schema = createSimpleSchema();
      const rows: RowData[] = [
        { rowId: 'row-1', data: { name: 'John' } },
        { rowId: 'row-2', data: { name: 'Jane' } },
      ];

      resolver.addTable('users', schema, rows);

      expect(resolver.hasTable('users')).toBe(true);
      expect(resolver.hasSchema('users')).toBe(true);
      expect(resolver.hasRow('users', 'row-1')).toBe(true);
      expect(resolver.hasRow('users', 'row-2')).toBe(true);
    });

    it('addRow adds row to existing table', () => {
      const resolver = createForeignKeyResolver();
      const schema = createSimpleSchema();

      resolver.addTable('users', schema, []);
      resolver.addRow('users', 'row-1', { name: 'John' });

      expect(resolver.hasRow('users', 'row-1')).toBe(true);
    });

    it('addRow does nothing if table not cached', () => {
      const resolver = createForeignKeyResolver();

      resolver.addRow('users', 'row-1', { name: 'John' });

      expect(resolver.hasRow('users', 'row-1')).toBe(false);
    });

    it('getSchema throws ForeignKeyNotFoundError when not cached', async () => {
      const resolver = createForeignKeyResolver();

      await expect(resolver.getSchema('unknown')).rejects.toThrow(ForeignKeyNotFoundError);
      await expect(resolver.getSchema('unknown')).rejects.toThrow(
        'Foreign key table not found: unknown',
      );
    });

    it('getRowData throws ForeignKeyNotFoundError when not cached', async () => {
      const resolver = createForeignKeyResolver();

      await expect(resolver.getRowData('unknown', 'row-1')).rejects.toThrow(ForeignKeyNotFoundError);
      await expect(resolver.getRowData('unknown', 'row-1')).rejects.toThrow(
        'Foreign key row not found: unknown/row-1',
      );
    });

    it('getRowData returns cached row', async () => {
      const resolver = createForeignKeyResolver();
      const schema = createSimpleSchema();

      resolver.addTable('users', schema, [{ rowId: 'row-1', data: { name: 'John' } }]);

      const result = await resolver.getRowData('users', 'row-1');
      expect(result.rowId).toBe('row-1');
      expect(result.data).toEqual({ name: 'John' });
    });

    it('hasSchema returns false for unknown table', () => {
      const resolver = createForeignKeyResolver();

      expect(resolver.hasSchema('unknown')).toBe(false);
    });

    it('hasTable returns false for unknown table', () => {
      const resolver = createForeignKeyResolver();

      expect(resolver.hasTable('unknown')).toBe(false);
    });

    it('hasRow returns false for unknown table', () => {
      const resolver = createForeignKeyResolver();

      expect(resolver.hasRow('unknown', 'row-1')).toBe(false);
    });

    it('hasRow returns false for unknown row in known table', () => {
      const resolver = createForeignKeyResolver();
      const schema = createSimpleSchema();

      resolver.addTable('users', schema, []);

      expect(resolver.hasRow('users', 'row-1')).toBe(false);
    });
  });

  describe('with loader', () => {
    const usersSchema = createSimpleSchema();

    it('getSchema loads via loader when not cached', async () => {
      const mockLoader = createMockLoader({
        loadSchema: async () => usersSchema,
      });
      const resolver = createForeignKeyResolver({ loader: mockLoader });

      const result = await resolver.getSchema('users');

      expect(mockLoader.loadSchemaCallCount).toBe(1);
      expect(result).toBe(usersSchema);
    });

    it('getSchema caches loaded schema', async () => {
      const mockLoader = createMockLoader({
        loadSchema: async () => usersSchema,
      });
      const resolver = createForeignKeyResolver({ loader: mockLoader });

      await resolver.getSchema('users');
      await resolver.getSchema('users');

      expect(mockLoader.loadSchemaCallCount).toBe(1);
    });

    it('getSchema returns cached schema without calling loader', async () => {
      const mockLoader = createMockLoader({
        loadSchema: async () => usersSchema,
      });
      const resolver = createForeignKeyResolver({ loader: mockLoader });
      resolver.addSchema('users', usersSchema);

      const result = await resolver.getSchema('users');

      expect(mockLoader.loadSchemaCallCount).toBe(0);
      expect(result).toBe(usersSchema);
    });

    it('getRowData loads via loader when not cached', async () => {
      const rowData: RowData = { rowId: 'row-1', data: { name: 'John' } };
      const mockLoader = createMockLoader({
        loadRow: async () => ({ schema: usersSchema, row: rowData }),
      });
      const resolver = createForeignKeyResolver({ loader: mockLoader });

      const result = await resolver.getRowData('users', 'row-1');

      expect(mockLoader.loadRowCallCount).toBe(1);
      expect(mockLoader.loadRowCalls[0]).toEqual({ tableId: 'users', rowId: 'row-1' });
      expect(result).toEqual(rowData);
    });

    it('getRowData caches loaded row', async () => {
      const rowData: RowData = { rowId: 'row-1', data: { name: 'John' } };
      const mockLoader = createMockLoader({
        loadRow: async () => ({ schema: usersSchema, row: rowData }),
      });
      const resolver = createForeignKeyResolver({ loader: mockLoader });

      await resolver.getRowData('users', 'row-1');
      await resolver.getRowData('users', 'row-1');

      expect(mockLoader.loadRowCallCount).toBe(1);
    });

    it('loadRow automatically adds schema to cache', async () => {
      const rowData: RowData = { rowId: 'row-1', data: { name: 'John' } };
      const mockLoader = createMockLoader({
        loadRow: async () => ({ schema: usersSchema, row: rowData }),
      });
      const resolver = createForeignKeyResolver({ loader: mockLoader });

      await resolver.getRowData('users', 'row-1');

      expect(resolver.hasSchema('users')).toBe(true);
    });

    it('concurrent getSchema calls share same promise', async () => {
      let resolvePromise: (schema: JsonObjectSchema) => void;
      const loadPromise = new Promise<JsonObjectSchema>((resolve) => {
        resolvePromise = resolve;
      });
      const mockLoader = createMockLoader({
        loadSchema: () => loadPromise,
      });
      const resolver = createForeignKeyResolver({ loader: mockLoader });

      const promise1 = resolver.getSchema('users');
      const promise2 = resolver.getSchema('users');

      resolvePromise!(usersSchema);

      const [result1, result2] = await Promise.all([promise1, promise2]);

      expect(mockLoader.loadSchemaCallCount).toBe(1);
      expect(result1).toBe(result2);
    });

    it('concurrent getRowData calls share same promise', async () => {
      const rowData: RowData = { rowId: 'row-1', data: { name: 'John' } };
      let resolvePromise: (result: { schema: JsonObjectSchema; row: RowData }) => void;
      const loadPromise = new Promise<{ schema: JsonObjectSchema; row: RowData }>((resolve) => {
        resolvePromise = resolve;
      });
      const mockLoader = createMockLoader({
        loadRow: () => loadPromise,
      });
      const resolver = createForeignKeyResolver({ loader: mockLoader });

      const promise1 = resolver.getRowData('users', 'row-1');
      const promise2 = resolver.getRowData('users', 'row-1');

      resolvePromise!({ schema: usersSchema, row: rowData });

      const [result1, result2] = await Promise.all([promise1, promise2]);

      expect(mockLoader.loadRowCallCount).toBe(1);
      expect(result1).toEqual(result2);
    });
  });

  describe('loading state', () => {
    it('isLoading false initially', () => {
      const resolver = createForeignKeyResolver();

      expect(resolver.isLoading('users')).toBe(false);
    });

    it('isLoading true during table load', async () => {
      let resolvePromise: (schema: JsonObjectSchema) => void;
      const loadPromise = new Promise<JsonObjectSchema>((resolve) => {
        resolvePromise = resolve;
      });
      const mockLoader = createMockLoader({
        loadSchema: () => loadPromise,
      });
      const resolver = createForeignKeyResolver({ loader: mockLoader });
      const schemaPromise = resolver.getSchema('users');

      expect(resolver.isLoading('users')).toBe(true);

      resolvePromise!(createSimpleSchema());
      await schemaPromise;

      expect(resolver.isLoading('users')).toBe(false);
    });

    it('isLoadingRow false initially', () => {
      const resolver = createForeignKeyResolver();

      expect(resolver.isLoadingRow('users', 'row-1')).toBe(false);
    });

    it('isLoadingRow true during row load', async () => {
      let resolvePromise: (result: { schema: JsonObjectSchema; row: RowData }) => void;
      const loadPromise = new Promise<{ schema: JsonObjectSchema; row: RowData }>((resolve) => {
        resolvePromise = resolve;
      });
      const mockLoader = createMockLoader({
        loadRow: () => loadPromise,
      });
      const resolver = createForeignKeyResolver({ loader: mockLoader });
      const rowPromise = resolver.getRowData('users', 'row-1');

      expect(resolver.isLoadingRow('users', 'row-1')).toBe(true);

      resolvePromise!({
        schema: createSimpleSchema(),
        row: { rowId: 'row-1', data: { name: 'John' } },
      });
      await rowPromise;

      expect(resolver.isLoadingRow('users', 'row-1')).toBe(false);
    });
  });

  describe('error handling', () => {
    it('loader error propagates from getSchema', async () => {
      const mockLoader = createMockLoader({
        loadSchema: async () => {
          throw new Error('Network error');
        },
      });
      const resolver = createForeignKeyResolver({ loader: mockLoader });

      await expect(resolver.getSchema('users')).rejects.toThrow('Network error');
    });

    it('loader error propagates from getRowData', async () => {
      const mockLoader = createMockLoader({
        loadRow: async () => {
          throw new Error('Network error');
        },
      });
      const resolver = createForeignKeyResolver({ loader: mockLoader });

      await expect(resolver.getRowData('users', 'row-1')).rejects.toThrow('Network error');
    });

    it('ForeignKeyNotFoundError contains tableId', () => {
      const error = new ForeignKeyNotFoundError('users');

      expect(error.tableId).toBe('users');
      expect(error.rowId).toBeUndefined();
    });

    it('ForeignKeyNotFoundError contains tableId and rowId', () => {
      const error = new ForeignKeyNotFoundError('users', 'row-1');

      expect(error.tableId).toBe('users');
      expect(error.rowId).toBe('row-1');
    });
  });

  describe('dispose', () => {
    it('dispose clears cache', () => {
      const resolver = createForeignKeyResolver();
      resolver.addSchema('users', createSimpleSchema());
      resolver.addTable('products', createSimpleSchema(), [{ rowId: 'p-1', data: {} }]);

      resolver.dispose();

      expect(resolver.hasSchema('users')).toBe(false);
      expect(resolver.hasTable('products')).toBe(false);
    });

    it('dispose prevents new additions', () => {
      const resolver = createForeignKeyResolver();

      resolver.dispose();
      resolver.addSchema('users', createSimpleSchema());

      expect(resolver.hasSchema('users')).toBe(false);
    });
  });

  describe('prefetch control', () => {
    it('prefetch disabled by default', () => {
      const resolver = createForeignKeyResolver();

      expect(resolver.isPrefetchEnabled).toBe(false);
    });

    it('prefetch can be enabled via options', () => {
      const resolver = createForeignKeyResolver({ prefetch: true });

      expect(resolver.isPrefetchEnabled).toBe(true);
    });

    it('setPrefetch enables prefetch at runtime', () => {
      const resolver = createForeignKeyResolver();

      resolver.setPrefetch(true);

      expect(resolver.isPrefetchEnabled).toBe(true);
    });

    it('setPrefetch disables prefetch at runtime', () => {
      const resolver = createForeignKeyResolver({ prefetch: true });

      resolver.setPrefetch(false);

      expect(resolver.isPrefetchEnabled).toBe(false);
    });
  });

  describe('renameTable', () => {
    it('renames schema in cache', () => {
      const resolver = createForeignKeyResolver();
      resolver.addSchema('users', createSimpleSchema());

      resolver.renameTable('users', 'customers');

      expect(resolver.hasSchema('users')).toBe(false);
      expect(resolver.hasSchema('customers')).toBe(true);
    });

    it('renames table with rows in cache', () => {
      const resolver = createForeignKeyResolver();
      resolver.addTable('users', createSimpleSchema(), [
        { rowId: 'user-1', data: { name: 'John' } },
      ]);

      resolver.renameTable('users', 'customers');

      expect(resolver.hasTable('users')).toBe(false);
      expect(resolver.hasTable('customers')).toBe(true);
      expect(resolver.hasRow('users', 'user-1')).toBe(false);
      expect(resolver.hasRow('customers', 'user-1')).toBe(true);
    });

    it('does nothing for non-existent table', () => {
      const resolver = createForeignKeyResolver();
      resolver.addSchema('users', createSimpleSchema());

      resolver.renameTable('unknown', 'customers');

      expect(resolver.hasSchema('users')).toBe(true);
      expect(resolver.hasSchema('customers')).toBe(false);
    });

    it('does nothing after dispose', () => {
      const resolver = createForeignKeyResolver();
      resolver.addSchema('users', createSimpleSchema());

      resolver.dispose();
      resolver.renameTable('users', 'customers');

      expect(resolver.hasSchema('users')).toBe(false);
      expect(resolver.hasSchema('customers')).toBe(false);
    });
  });
});
