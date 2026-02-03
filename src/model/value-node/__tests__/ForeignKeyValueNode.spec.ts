import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  JsonSchemaTypeName,
  type JsonObjectSchema,
  type JsonStringSchema,
} from '../../../types/schema.types.js';
import { createForeignKeyResolver } from '../../foreign-key-resolver/ForeignKeyResolverImpl.js';
import {
  ForeignKeyNotFoundError,
  ForeignKeyResolverNotConfiguredError,
} from '../../foreign-key-resolver/errors.js';
import type { ForeignKeyResolver } from '../../foreign-key-resolver/ForeignKeyResolver.js';
import {
  ForeignKeyValueNodeImpl,
  isForeignKeyValueNode,
  type ForeignKeyValueNode,
} from '../ForeignKeyValueNode.js';
import { StringValueNode } from '../StringValueNode.js';

const createFKSchema = (foreignKey: string): JsonStringSchema => ({
  type: JsonSchemaTypeName.String,
  default: '',
  foreignKey,
});

const createCategorySchema = (): JsonObjectSchema => ({
  type: JsonSchemaTypeName.Object,
  additionalProperties: false,
  required: ['name'],
  properties: {
    name: { type: JsonSchemaTypeName.String, default: '' },
  },
});

describe('ForeignKeyValueNode', () => {
  describe('constructor', () => {
    it('creates node with foreignKey schema', () => {
      const node = new ForeignKeyValueNodeImpl(undefined, 'categoryId', createFKSchema('categories'), 'cat-1');

      expect(node.foreignKey).toBe('categories');
      expect(node.value).toBe('cat-1');
    });

    it('throws if schema has no foreignKey property', () => {
      const schema: JsonStringSchema = { type: JsonSchemaTypeName.String, default: '' };

      expect(() => new ForeignKeyValueNodeImpl(undefined, 'field', schema, 'value')).toThrow(
        'ForeignKeyValueNode requires a schema with foreignKey property',
      );
    });

    it('works without fkResolver', () => {
      const node = new ForeignKeyValueNodeImpl(undefined, 'categoryId', createFKSchema('categories'), 'cat-1');

      expect(node.foreignKey).toBe('categories');
      expect(node.isLoading).toBe(false);
    });
  });

  describe('isForeignKeyValueNode', () => {
    it('returns true for ForeignKeyValueNodeImpl instance', () => {
      const node = new ForeignKeyValueNodeImpl(undefined, 'categoryId', createFKSchema('categories'), 'cat-1');

      expect(isForeignKeyValueNode(node)).toBe(true);
    });

    it('returns true for node with foreignKey property', () => {
      const mockNode = {
        foreignKey: 'categories',
        value: 'cat-1',
      } as unknown as ForeignKeyValueNode;

      expect(isForeignKeyValueNode(mockNode)).toBe(true);
    });

    it('returns false for StringValueNode without foreignKey', () => {
      const schema: JsonStringSchema = { type: JsonSchemaTypeName.String, default: '' };
      const node = new StringValueNode(undefined, 'name', schema, 'value');

      expect(isForeignKeyValueNode(node)).toBe(false);
    });

    it('returns false for node with non-string foreignKey', () => {
      const mockNode = {
        foreignKey: 123,
        value: 'cat-1',
      } as unknown as ForeignKeyValueNode;

      expect(isForeignKeyValueNode(mockNode)).toBe(false);
    });
  });

  describe('isLoading', () => {
    let fkResolver: ForeignKeyResolver;

    beforeEach(() => {
      fkResolver = createForeignKeyResolver();
    });

    it('returns false when no fkResolver', () => {
      const node = new ForeignKeyValueNodeImpl(undefined, 'categoryId', createFKSchema('categories'), 'cat-1');

      expect(node.isLoading).toBe(false);
    });

    it('returns false when row is cached', () => {
      const schema = createCategorySchema();
      fkResolver.addTable('categories', schema, [{ rowId: 'cat-1', data: { name: 'Electronics' } }]);

      const node = new ForeignKeyValueNodeImpl(
        undefined,
        'categoryId',
        createFKSchema('categories'),
        'cat-1',
        fkResolver,
      );

      expect(node.isLoading).toBe(false);
    });

    it('returns true when row is loading', async () => {
      let resolveLoad: ((value: unknown) => void) | undefined;
      const loadPromise = new Promise((resolve) => {
        resolveLoad = resolve;
      });

      const fkResolverWithLoader = createForeignKeyResolver({
        loader: {
          loadSchema: async () => createCategorySchema(),
          loadTable: async () => ({ schema: createCategorySchema(), rows: [] }),
          loadRow: async () => {
            await loadPromise;
            return { schema: createCategorySchema(), row: { rowId: 'cat-1', data: { name: 'Test' } } };
          },
        },
      });

      fkResolverWithLoader.addSchema('categories', createCategorySchema());

      const node = new ForeignKeyValueNodeImpl(
        undefined,
        'categoryId',
        createFKSchema('categories'),
        'cat-1',
        fkResolverWithLoader,
      );

      const getRowPromise = node.getRow();
      expect(node.isLoading).toBe(true);

      resolveLoad!(undefined);
      await getRowPromise;
      expect(node.isLoading).toBe(false);
    });
  });

  describe('getRow', () => {
    let fkResolver: ForeignKeyResolver;

    beforeEach(() => {
      fkResolver = createForeignKeyResolver();
    });

    it('throws ForeignKeyResolverNotConfiguredError when no resolver', async () => {
      const node = new ForeignKeyValueNodeImpl(undefined, 'categoryId', createFKSchema('categories'), 'cat-1');

      await expect(node.getRow()).rejects.toThrow(ForeignKeyResolverNotConfiguredError);
    });

    it('throws ForeignKeyNotFoundError when value is empty', async () => {
      const node = new ForeignKeyValueNodeImpl(
        undefined,
        'categoryId',
        createFKSchema('categories'),
        '',
        fkResolver,
      );

      await expect(node.getRow()).rejects.toThrow(ForeignKeyNotFoundError);
    });

    it('returns row data when cached', async () => {
      const schema = createCategorySchema();
      fkResolver.addTable('categories', schema, [{ rowId: 'cat-1', data: { name: 'Electronics' } }]);

      const node = new ForeignKeyValueNodeImpl(
        undefined,
        'categoryId',
        createFKSchema('categories'),
        'cat-1',
        fkResolver,
      );

      const row = await node.getRow();
      expect(row).toEqual({ rowId: 'cat-1', data: { name: 'Electronics' } });
    });

    it('loads row via loader when not cached', async () => {
      const schema = createCategorySchema();
      const fkResolverWithLoader = createForeignKeyResolver({
        loader: {
          loadSchema: async () => schema,
          loadTable: async () => ({ schema, rows: [] }),
          loadRow: async (_tableId, rowId) => ({
            schema,
            row: { rowId, data: { name: 'Loaded Category' } },
          }),
        },
      });
      fkResolverWithLoader.addSchema('categories', schema);

      const node = new ForeignKeyValueNodeImpl(
        undefined,
        'categoryId',
        createFKSchema('categories'),
        'cat-1',
        fkResolverWithLoader,
      );

      const row = await node.getRow();
      expect(row).toEqual({ rowId: 'cat-1', data: { name: 'Loaded Category' } });
    });
  });

  describe('getSchema', () => {
    let fkResolver: ForeignKeyResolver;

    beforeEach(() => {
      fkResolver = createForeignKeyResolver();
    });

    it('throws ForeignKeyResolverNotConfiguredError when no resolver', async () => {
      const node = new ForeignKeyValueNodeImpl(undefined, 'categoryId', createFKSchema('categories'), 'cat-1');

      await expect(node.getSchema()).rejects.toThrow(ForeignKeyResolverNotConfiguredError);
    });

    it('returns schema when cached', async () => {
      const schema = createCategorySchema();
      fkResolver.addSchema('categories', schema);

      const node = new ForeignKeyValueNodeImpl(
        undefined,
        'categoryId',
        createFKSchema('categories'),
        'cat-1',
        fkResolver,
      );

      const result = await node.getSchema();
      expect(result).toEqual(schema);
    });

    it('loads schema via loader when not cached', async () => {
      const schema = createCategorySchema();
      const fkResolverWithLoader = createForeignKeyResolver({
        loader: {
          loadSchema: async () => schema,
          loadTable: async () => ({ schema, rows: [] }),
          loadRow: async () => ({ schema, row: { rowId: '', data: {} } }),
        },
      });

      const node = new ForeignKeyValueNodeImpl(
        undefined,
        'categoryId',
        createFKSchema('categories'),
        'cat-1',
        fkResolverWithLoader,
      );

      const result = await node.getSchema();
      expect(result).toEqual(schema);
    });
  });

  describe('inherits StringValueNode behavior', () => {
    it('supports setValue', () => {
      const node = new ForeignKeyValueNodeImpl(undefined, 'categoryId', createFKSchema('categories'), 'cat-1');

      node.setValue('cat-2');
      expect(node.value).toBe('cat-2');
    });

    it('supports dirty tracking', () => {
      const node = new ForeignKeyValueNodeImpl(undefined, 'categoryId', createFKSchema('categories'), 'cat-1');

      expect(node.isDirty).toBe(false);

      node.setValue('cat-2');
      expect(node.isDirty).toBe(true);

      node.revert();
      expect(node.value).toBe('cat-1');
      expect(node.isDirty).toBe(false);
    });

    it('supports commit', () => {
      const node = new ForeignKeyValueNodeImpl(undefined, 'categoryId', createFKSchema('categories'), 'cat-1');

      node.setValue('cat-2');
      node.commit();

      expect(node.isDirty).toBe(false);
      expect(node.baseValue).toBe('cat-2');
    });
  });
});
