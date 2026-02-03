import { describe, it, expect, beforeEach } from '@jest/globals';
import { JsonSchemaTypeName, type JsonObjectSchema } from '../../../types/schema.types.js';
import { createForeignKeyResolver } from '../ForeignKeyResolverImpl.js';
import type { ForeignKeyLoader, RowData } from '../types.js';

const createCategorySchema = (): JsonObjectSchema => ({
  type: JsonSchemaTypeName.Object,
  additionalProperties: false,
  required: ['name'],
  properties: {
    name: { type: JsonSchemaTypeName.String, default: '' },
  },
});

const createProductSchema = (): JsonObjectSchema => ({
  type: JsonSchemaTypeName.Object,
  additionalProperties: false,
  required: ['name', 'categoryId'],
  properties: {
    name: { type: JsonSchemaTypeName.String, default: '' },
    categoryId: { type: JsonSchemaTypeName.String, default: '', foreignKey: 'categories' },
  },
});

const createProductWithMultipleFKSchema = (): JsonObjectSchema => ({
  type: JsonSchemaTypeName.Object,
  additionalProperties: false,
  required: ['name', 'categoryId', 'brandId'],
  properties: {
    name: { type: JsonSchemaTypeName.String, default: '' },
    categoryId: { type: JsonSchemaTypeName.String, default: '', foreignKey: 'categories' },
    brandId: { type: JsonSchemaTypeName.String, default: '', foreignKey: 'brands' },
  },
});

function createMockLoader(
  rowHandler?: (tableId: string, rowId: string) => Promise<{ schema: JsonObjectSchema; row: RowData }>,
): ForeignKeyLoader & {
  loadRowCalls: Array<{ tableId: string; rowId: string }>;
  loadRowCallCount: number;
} {
  const loader = {
    loadRowCalls: [] as Array<{ tableId: string; rowId: string }>,
    loadRowCallCount: 0,
    loadSchema: async () => {
      throw new Error('loadSchema not implemented');
    },
    loadTable: async () => {
      throw new Error('loadTable not implemented');
    },
    loadRow: async (tableId: string, rowId: string) => {
      loader.loadRowCalls.push({ tableId, rowId });
      loader.loadRowCallCount++;
      if (rowHandler) {
        return rowHandler(tableId, rowId);
      }
      throw new Error('loadRow not implemented');
    },
  };
  return loader;
}

function flushMicrotasks(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

describe('ForeignKeyResolver prefetch', () => {
  let mockLoader: ReturnType<typeof createMockLoader>;
  const categorySchema = createCategorySchema();
  const productSchema = createProductSchema();

  beforeEach(() => {
    mockLoader = createMockLoader();
  });

  describe('prefetch disabled', () => {
    it('addRow does not trigger FK loading', () => {
      const resolver = createForeignKeyResolver({
        loader: mockLoader,
        prefetch: false,
      });
      resolver.addTable('products', productSchema, []);

      resolver.addRow('products', 'prod-1', { name: 'iPhone', categoryId: 'cat-1' });

      expect(mockLoader.loadRowCallCount).toBe(0);
    });

    it('addTable does not trigger FK loading', () => {
      const resolver = createForeignKeyResolver({
        loader: mockLoader,
        prefetch: false,
      });

      resolver.addTable('products', productSchema, [
        { rowId: 'prod-1', data: { name: 'iPhone', categoryId: 'cat-1' } },
      ]);

      expect(mockLoader.loadRowCallCount).toBe(0);
    });
  });

  describe('prefetch enabled', () => {
    it('addRow triggers background FK loading', async () => {
      const categoryRow: RowData = { rowId: 'cat-1', data: { name: 'Electronics' } };
      mockLoader = createMockLoader(async () => ({ schema: categorySchema, row: categoryRow }));

      const resolver = createForeignKeyResolver({
        loader: mockLoader,
        prefetch: true,
      });
      resolver.addTable('products', productSchema, []);

      resolver.addRow('products', 'prod-1', { name: 'iPhone', categoryId: 'cat-1' });

      await flushMicrotasks();

      expect(mockLoader.loadRowCalls).toContainEqual({ tableId: 'categories', rowId: 'cat-1' });
    });

    it('addTable triggers background FK loading for all rows', async () => {
      const categoryRow1: RowData = { rowId: 'cat-1', data: { name: 'Electronics' } };
      const categoryRow2: RowData = { rowId: 'cat-2', data: { name: 'Clothing' } };
      mockLoader = createMockLoader(async (_tableId, rowId) => {
        if (rowId === 'cat-1') return { schema: categorySchema, row: categoryRow1 };
        return { schema: categorySchema, row: categoryRow2 };
      });

      const resolver = createForeignKeyResolver({
        loader: mockLoader,
        prefetch: true,
      });

      resolver.addTable('products', productSchema, [
        { rowId: 'prod-1', data: { name: 'iPhone', categoryId: 'cat-1' } },
        { rowId: 'prod-2', data: { name: 'Shirt', categoryId: 'cat-2' } },
      ]);

      await flushMicrotasks();

      expect(mockLoader.loadRowCalls).toContainEqual({ tableId: 'categories', rowId: 'cat-1' });
      expect(mockLoader.loadRowCalls).toContainEqual({ tableId: 'categories', rowId: 'cat-2' });
    });

    it('prefetch does not duplicate requests for same FK value', async () => {
      const categoryRow: RowData = { rowId: 'cat-1', data: { name: 'Electronics' } };
      mockLoader = createMockLoader(async () => ({ schema: categorySchema, row: categoryRow }));

      const resolver = createForeignKeyResolver({
        loader: mockLoader,
        prefetch: true,
      });

      resolver.addTable('products', productSchema, [
        { rowId: 'prod-1', data: { name: 'iPhone', categoryId: 'cat-1' } },
        { rowId: 'prod-2', data: { name: 'iPad', categoryId: 'cat-1' } },
      ]);

      await flushMicrotasks();

      expect(mockLoader.loadRowCallCount).toBe(1);
    });

    it('prefetch skips already cached rows', async () => {
      const resolver = createForeignKeyResolver({
        loader: mockLoader,
        prefetch: true,
      });
      resolver.addTable('categories', categorySchema, [
        { rowId: 'cat-1', data: { name: 'Electronics' } },
      ]);

      resolver.addTable('products', productSchema, [
        { rowId: 'prod-1', data: { name: 'iPhone', categoryId: 'cat-1' } },
      ]);

      await flushMicrotasks();

      expect(mockLoader.loadRowCallCount).toBe(0);
    });

    it('prefetch handles multiple FK fields', async () => {
      const brandSchema = createCategorySchema();
      const categoryRow: RowData = { rowId: 'cat-1', data: { name: 'Electronics' } };
      const brandRow: RowData = { rowId: 'brand-1', data: { name: 'Apple' } };

      mockLoader = createMockLoader(async (tableId) => {
        if (tableId === 'categories') {
          return { schema: categorySchema, row: categoryRow };
        }
        return { schema: brandSchema, row: brandRow };
      });

      const resolver = createForeignKeyResolver({
        loader: mockLoader,
        prefetch: true,
      });

      resolver.addTable('products', createProductWithMultipleFKSchema(), [
        { rowId: 'prod-1', data: { name: 'iPhone', categoryId: 'cat-1', brandId: 'brand-1' } },
      ]);

      await flushMicrotasks();

      expect(mockLoader.loadRowCalls).toContainEqual({ tableId: 'categories', rowId: 'cat-1' });
      expect(mockLoader.loadRowCalls).toContainEqual({ tableId: 'brands', rowId: 'brand-1' });
    });

    it('prefetch errors are silently ignored', async () => {
      mockLoader = createMockLoader(async () => {
        throw new Error('Network error');
      });

      const resolver = createForeignKeyResolver({
        loader: mockLoader,
        prefetch: true,
      });
      resolver.addTable('products', productSchema, []);

      expect(() => {
        resolver.addRow('products', 'prod-1', { name: 'iPhone', categoryId: 'cat-1' });
      }).not.toThrow();

      await flushMicrotasks();
    });

    it('prefetch does not block addRow', () => {
      let resolvePromise: (result: { schema: JsonObjectSchema; row: RowData }) => void;
      mockLoader = createMockLoader(
        () =>
          new Promise((resolve) => {
            resolvePromise = resolve;
          }),
      );

      const resolver = createForeignKeyResolver({
        loader: mockLoader,
        prefetch: true,
      });
      resolver.addTable('products', productSchema, []);

      resolver.addRow('products', 'prod-1', { name: 'iPhone', categoryId: 'cat-1' });

      expect(resolver.hasRow('products', 'prod-1')).toBe(true);

      resolvePromise!({
        schema: categorySchema,
        row: { rowId: 'cat-1', data: { name: 'Electronics' } },
      });
    });

    it('prefetch does not block addTable', () => {
      let resolvePromise: (result: { schema: JsonObjectSchema; row: RowData }) => void;
      mockLoader = createMockLoader(
        () =>
          new Promise((resolve) => {
            resolvePromise = resolve;
          }),
      );

      const resolver = createForeignKeyResolver({
        loader: mockLoader,
        prefetch: true,
      });

      resolver.addTable('products', productSchema, [
        { rowId: 'prod-1', data: { name: 'iPhone', categoryId: 'cat-1' } },
      ]);

      expect(resolver.hasTable('products')).toBe(true);

      resolvePromise!({
        schema: categorySchema,
        row: { rowId: 'cat-1', data: { name: 'Electronics' } },
      });
    });

    it('prefetch skips empty FK values', async () => {
      const resolver = createForeignKeyResolver({
        loader: mockLoader,
        prefetch: true,
      });

      resolver.addTable('products', productSchema, [
        { rowId: 'prod-1', data: { name: 'iPhone', categoryId: '' } },
      ]);

      await flushMicrotasks();

      expect(mockLoader.loadRowCallCount).toBe(0);
    });

    it('prefetch skips null FK values', async () => {
      const resolver = createForeignKeyResolver({
        loader: mockLoader,
        prefetch: true,
      });

      resolver.addTable('products', productSchema, [
        { rowId: 'prod-1', data: { name: 'iPhone', categoryId: null } },
      ]);

      await flushMicrotasks();

      expect(mockLoader.loadRowCallCount).toBe(0);
    });

    it('prefetch skips schema without FK fields', async () => {
      const schemaWithoutFK: JsonObjectSchema = {
        type: JsonSchemaTypeName.Object,
        additionalProperties: false,
        required: ['name', 'count'],
        properties: {
          name: { type: JsonSchemaTypeName.String, default: '' },
          count: { type: JsonSchemaTypeName.Number, default: 0 },
        },
      };

      const resolver = createForeignKeyResolver({
        loader: mockLoader,
        prefetch: true,
      });

      resolver.addTable('products', schemaWithoutFK, [
        { rowId: 'prod-1', data: { name: 'iPhone', count: 5 } },
      ]);

      await flushMicrotasks();

      expect(mockLoader.loadRowCallCount).toBe(0);
    });

    it('prefetch does nothing without loader', async () => {
      const resolver = createForeignKeyResolver({
        prefetch: true,
      });

      resolver.addTable('products', productSchema, [
        { rowId: 'prod-1', data: { name: 'iPhone', categoryId: 'cat-1' } },
      ]);

      await flushMicrotasks();

      expect(resolver.hasRow('categories', 'cat-1')).toBe(false);
    });
  });

  describe('setPrefetch runtime control', () => {
    it('enabling prefetch at runtime triggers on next addRow', async () => {
      const categoryRow: RowData = { rowId: 'cat-1', data: { name: 'Electronics' } };
      mockLoader = createMockLoader(async () => ({ schema: categorySchema, row: categoryRow }));

      const resolver = createForeignKeyResolver({
        loader: mockLoader,
        prefetch: false,
      });
      resolver.addTable('products', productSchema, []);

      resolver.addRow('products', 'prod-1', { name: 'iPhone', categoryId: 'cat-1' });
      await flushMicrotasks();
      expect(mockLoader.loadRowCallCount).toBe(0);

      resolver.setPrefetch(true);
      resolver.addRow('products', 'prod-2', { name: 'iPad', categoryId: 'cat-2' });
      await flushMicrotasks();

      expect(mockLoader.loadRowCalls).toContainEqual({ tableId: 'categories', rowId: 'cat-2' });
    });

    it('disabling prefetch stops automatic loading', async () => {
      const categoryRow: RowData = { rowId: 'cat-1', data: { name: 'Electronics' } };
      mockLoader = createMockLoader(async () => ({ schema: categorySchema, row: categoryRow }));

      const resolver = createForeignKeyResolver({
        loader: mockLoader,
        prefetch: true,
      });
      resolver.addTable('products', productSchema, []);

      resolver.setPrefetch(false);
      resolver.addRow('products', 'prod-1', { name: 'iPhone', categoryId: 'cat-1' });

      await flushMicrotasks();

      expect(mockLoader.loadRowCallCount).toBe(0);
    });
  });
});
