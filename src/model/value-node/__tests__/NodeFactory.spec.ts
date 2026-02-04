import { jest } from '@jest/globals';
import type { JsonSchema } from '../../../types/schema.types.js';
import {
  createNodeFactory,
  NodeFactoryRegistry,
  NodeFactory,
  resetNodeIdCounter,
  type NodeFactoryFn,
} from '../index.js';
import { obj, str, num, bool, arr, ref } from '../../../mocks/schema.mocks.js';

beforeEach(() => {
  resetNodeIdCounter();
});

describe('NodeFactoryRegistry', () => {
  it('registers and retrieves factory', () => {
    const registry = new NodeFactoryRegistry();
    const factory = jest.fn() as unknown as NodeFactoryFn;

    registry.register('custom', factory);

    expect(registry.get('custom')).toBe(factory);
  });

  it('has returns true for registered type', () => {
    const registry = new NodeFactoryRegistry();
    registry.register('custom', jest.fn() as unknown as NodeFactoryFn);

    expect(registry.has('custom')).toBe(true);
    expect(registry.has('unknown')).toBe(false);
  });

  it('supports chaining', () => {
    const registry = new NodeFactoryRegistry();
    const mockFn = jest.fn() as unknown as NodeFactoryFn;

    const result = registry.register('a', mockFn).register('b', mockFn);

    expect(result).toBe(registry);
  });
});

describe('NodeFactory', () => {
  let factory: NodeFactory;

  beforeEach(() => {
    factory = createNodeFactory();
  });

  describe('primitive types', () => {
    it('creates string node', () => {
      const node = factory.create('name', str(), 'John');

      expect(node.isPrimitive()).toBe(true);
      expect(node.name).toBe('name');
      expect(node.getPlainValue()).toBe('John');
    });

    it('creates string node with default value', () => {
      const node = factory.create('name', str({ default: 'default' }), undefined);

      expect(node.getPlainValue()).toBe('default');
    });

    it('creates number node', () => {
      const node = factory.create('age', num(), 25);

      expect(node.isPrimitive()).toBe(true);
      expect(node.getPlainValue()).toBe(25);
    });

    it('creates number node with default', () => {
      const node = factory.create('count', num(), undefined);

      expect(node.getPlainValue()).toBe(0);
    });

    it('creates boolean node', () => {
      const node = factory.create('active', bool(), true);

      expect(node.isPrimitive()).toBe(true);
      expect(node.getPlainValue()).toBe(true);
    });

    it('creates boolean node with default', () => {
      const node = factory.create('enabled', bool(), undefined);

      expect(node.getPlainValue()).toBe(false);
    });
  });

  describe('object type', () => {
    it('creates empty object node', () => {
      const node = factory.create('user', obj({}), {});

      expect(node.isObject()).toBe(true);
      expect(node.getPlainValue()).toEqual({});
    });

    it('creates object node with properties', () => {
      const schema = obj({
        name: str(),
        age: num(),
      });
      const node = factory.create('user', schema, { name: 'John', age: 25 });

      expect(node.isObject()).toBe(true);
      expect(node.getPlainValue()).toEqual({ name: 'John', age: 25 });
    });

    it('creates nested object', () => {
      const schema = obj({
        address: obj({
          city: str(),
        }),
      });
      const node = factory.create('user', schema, {
        address: { city: 'NYC' },
      });

      expect(node.getPlainValue()).toEqual({
        address: { city: 'NYC' },
      });
    });

    it('uses default values for missing properties', () => {
      const schema = obj({
        name: str({ default: 'Unknown' }),
      });
      const node = factory.create('user', schema, {});

      expect(node.getPlainValue()).toEqual({ name: 'Unknown' });
    });

    it('handles null value as empty object', () => {
      const schema = obj({
        name: str(),
      });
      const node = factory.create('user', schema, null);

      expect(node.getPlainValue()).toEqual({ name: '' });
    });
  });

  describe('array type', () => {
    it('creates empty array node', () => {
      const node = factory.create('tags', arr(str()), []);

      expect(node.isArray()).toBe(true);
      expect(node.getPlainValue()).toEqual([]);
    });

    it('creates array of strings', () => {
      const node = factory.create('tags', arr(str()), ['a', 'b', 'c']);

      expect(node.getPlainValue()).toEqual(['a', 'b', 'c']);
    });

    it('creates array of numbers', () => {
      const node = factory.create('scores', arr(num()), [1, 2, 3]);

      expect(node.getPlainValue()).toEqual([1, 2, 3]);
    });

    it('creates array of objects', () => {
      const schema = arr(
        obj({
          id: num(),
          name: str(),
        }),
      );
      const node = factory.create('items', schema, [
        { id: 1, name: 'First' },
        { id: 2, name: 'Second' },
      ]);

      expect(node.getPlainValue()).toEqual([
        { id: 1, name: 'First' },
        { id: 2, name: 'Second' },
      ]);
    });

    it('creates nested arrays', () => {
      const schema = arr(arr(num()));
      const node = factory.create('matrix', schema, [
        [1, 2],
        [3, 4],
      ]);

      expect(node.getPlainValue()).toEqual([
        [1, 2],
        [3, 4],
      ]);
    });

    it('handles null value as empty array', () => {
      const node = factory.create('tags', arr(str()), null);

      expect(node.getPlainValue()).toEqual([]);
    });

    it('handles undefined value as empty array', () => {
      const node = factory.create('tags', arr(str()), undefined);

      expect(node.getPlainValue()).toEqual([]);
    });
  });

  describe('createTree', () => {
    it('creates root with empty name', () => {
      const schema = obj({
        name: str(),
      });
      const node = factory.createTree(schema, { name: 'John' });

      expect(node.name).toBe('');
      expect(node.getPlainValue()).toEqual({ name: 'John' });
    });

    it('creates array as root', () => {
      const node = factory.createTree(arr(num()), [1, 2, 3]);

      expect(node.isArray()).toBe(true);
      expect(node.getPlainValue()).toEqual([1, 2, 3]);
    });

    it('creates primitive as root', () => {
      const node = factory.createTree(str(), 'hello');

      expect(node.isPrimitive()).toBe(true);
      expect(node.getPlainValue()).toBe('hello');
    });
  });

  describe('custom id', () => {
    it('uses provided id', () => {
      const node = factory.create('name', str(), 'John', 'custom-id');

      expect(node.id).toBe('custom-id');
    });

    it('generates id when not provided', () => {
      const node = factory.create('name', str(), 'John');

      expect(node.id).toBe('node-1');
    });
  });

  describe('complex schema', () => {
    it('creates complex nested structure', () => {
      const schema = obj({
        user: obj({
          name: str(),
          addresses: arr(
            obj({
              city: str(),
              zip: str(),
            }),
          ),
        }),
        tags: arr(str()),
      });

      const value = {
        user: {
          name: 'John',
          addresses: [
            { city: 'NYC', zip: '10001' },
            { city: 'LA', zip: '90001' },
          ],
        },
        tags: ['admin', 'user'],
      };

      const node = factory.createTree(schema, value);

      expect(node.getPlainValue()).toEqual(value);
    });
  });

  describe('error handling', () => {
    it('throws for unknown schema type', () => {
      const registry = new NodeFactoryRegistry();
      const localFactory = new NodeFactory(registry);

      expect(() =>
        localFactory.create(
          'field',
          { type: 'unknown' } as unknown as JsonSchema,
          null,
        ),
      ).toThrow('Unknown schema type: unknown');
    });

    it('defaults to object when type is missing', () => {
      const schema = {
        properties: {
          name: str(),
        },
        additionalProperties: false,
        required: ['name'],
      } as unknown as JsonSchema;
      const node = factory.create('data', schema, { name: 'John' });

      expect(node.isObject()).toBe(true);
    });
  });

  describe('parent relationships', () => {
    it('sets parent on object children', () => {
      const schema = obj({
        name: str(),
      });
      const node = factory.create('user', schema, { name: 'John' });

      if (node.isObject()) {
        const nameNode = node.child('name');
        expect(nameNode?.parent).toBe(node);
      }
    });

    it('sets parent on array items', () => {
      const node = factory.create('items', arr(num()), [1, 2]);

      if (node.isArray()) {
        const item = node.at(0);
        expect(item?.parent).toBe(node);
      }
    });
  });

  describe('refSchemas resolution', () => {
    const fileSchema = obj({
      status: str({ readOnly: true }),
      fileId: str({ readOnly: true }),
      url: str({ readOnly: true }),
      fileName: str(),
    });

    const refSchemas = {
      File: fileSchema,
    };

    it('resolves $ref to full schema', () => {
      const factory = createNodeFactory({ refSchemas });
      const schema: JsonSchema = { $ref: 'File' };
      const value = {
        status: 'ready',
        fileId: 'abc123',
        url: '',
        fileName: 'test.jpg',
      };

      const node = factory.create('avatar', schema, value);

      expect(node.isObject()).toBe(true);
      expect(node.getPlainValue()).toEqual(value);
      expect((node.schema as { $ref?: string }).$ref).toBe('File');
    });

    it('resolves nested $ref in object properties', () => {
      const factory = createNodeFactory({ refSchemas });
      const schema = obj({
        name: str(),
        avatar: ref('File'),
      });
      const value = {
        name: 'John',
        avatar: {
          status: 'uploaded',
          fileId: 'xyz789',
          url: 'http://example.com/file.jpg',
          fileName: 'photo.jpg',
        },
      };

      const node = factory.createTree(schema, value);

      expect(node.getPlainValue()).toEqual(value);
      if (node.isObject()) {
        const avatarNode = node.child('avatar');
        expect(avatarNode?.isObject()).toBe(true);
        expect((avatarNode?.schema as { $ref?: string }).$ref).toBe('File');
        if (avatarNode?.isObject()) {
          expect(avatarNode.child('fileName')?.getPlainValue()).toBe(
            'photo.jpg',
          );
        }
      }
    });

    it('resolves $ref in array items', () => {
      const factory = createNodeFactory({ refSchemas });
      const schema = arr(ref('File'));
      const value = [
        { status: 'ready', fileId: '1', url: '', fileName: 'a.jpg' },
        { status: 'ready', fileId: '2', url: '', fileName: 'b.jpg' },
      ];

      const node = factory.createTree(schema, value);

      expect(node.isArray()).toBe(true);
      if (node.isArray()) {
        expect(node.length).toBe(2);
        const first = node.at(0);
        expect(first?.isObject()).toBe(true);
        expect((first?.schema as { $ref?: string }).$ref).toBe('File');
      }
    });

    it('preserves title/description/deprecated from original schema', () => {
      const factory = createNodeFactory({ refSchemas });
      const schema = ref('File', {
        title: 'User Avatar',
        description: 'Profile picture',
        deprecated: true,
      });

      const node = factory.create('avatar', schema, {});

      expect((node.schema as { title?: string }).title).toBe('User Avatar');
      expect((node.schema as { description?: string }).description).toBe(
        'Profile picture',
      );
      expect((node.schema as { deprecated?: boolean }).deprecated).toBe(true);
      expect((node.schema as { $ref?: string }).$ref).toBe('File');
    });

    it('returns original schema when $ref not found in refSchemas', () => {
      const factory = createNodeFactory({ refSchemas });
      const schema: JsonSchema = { $ref: 'Unknown' };

      const node = factory.create('field', schema, {});

      expect(node.isObject()).toBe(true);
      expect((node.schema as { $ref?: string }).$ref).toBe('Unknown');
      expect(node.getPlainValue()).toEqual({});
    });

    it('works without refSchemas option', () => {
      const factory = createNodeFactory();
      const schema = obj({
        name: str(),
      });

      const node = factory.create('user', schema, { name: 'John' });

      expect(node.getPlainValue()).toEqual({ name: 'John' });
    });
  });
});
