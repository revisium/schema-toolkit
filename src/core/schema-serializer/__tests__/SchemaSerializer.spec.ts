import { describe, it, expect, beforeEach } from '@jest/globals';
import { SchemaSerializer } from '../SchemaSerializer.js';
import { createSchemaTree } from '../../schema-tree/index.js';
import {
  createObjectNode,
  createArrayNode,
  createStringNode,
  createNumberNode,
  createBooleanNode,
  createRefNode,
} from '../../schema-node/index.js';
import type { NodeMetadata } from '../../schema-node/index.js';
import { createMockFormula } from '../../schema-node/__tests__/test-helpers.js';
import { obj, str, num, bool, arr, ref } from '../../../mocks/schema.mocks.js';

describe('SchemaSerializer', () => {
  let serializer: SchemaSerializer;

  beforeEach(() => {
    serializer = new SchemaSerializer();
  });

  describe('serializeTree', () => {
    it('serializes empty object', () => {
      const root = createObjectNode('root', 'root');
      const tree = createSchemaTree(root);

      const result = serializer.serializeTree(tree);

      expect(result).toEqual(obj({}));
    });

    it('serializes object with string field', () => {
      const root = createObjectNode('root', 'root', [
        createStringNode('name-id', 'name', { defaultValue: '' }),
      ]);
      const tree = createSchemaTree(root);

      const result = serializer.serializeTree(tree);

      expect(result).toEqual(obj({ name: str() }));
    });

    it('serializes object with multiple fields', () => {
      const root = createObjectNode('root', 'root', [
        createStringNode('name-id', 'name', { defaultValue: 'test' }),
        createNumberNode('age-id', 'age', { defaultValue: 25 }),
        createBooleanNode('active-id', 'active', { defaultValue: true }),
      ]);
      const tree = createSchemaTree(root);

      const result = serializer.serializeTree(tree);

      expect(result.properties).toEqual({
        name: str({ default: 'test' }),
        age: num({ default: 25 }),
        active: bool({ default: true }),
      });
      expect(result.required).toEqual(['name', 'age', 'active']);
    });
  });

  describe('string fields', () => {
    it('serializes string with default value', () => {
      const root = createObjectNode('root', 'root', [
        createStringNode('field-id', 'field', { defaultValue: 'hello' }),
      ]);
      const tree = createSchemaTree(root);

      const result = serializer.serializeTree(tree);

      expect(result.properties.field).toEqual(str({ default: 'hello' }));
    });

    it('serializes string with empty default', () => {
      const root = createObjectNode('root', 'root', [
        createStringNode('field-id', 'field'),
      ]);
      const tree = createSchemaTree(root);

      const result = serializer.serializeTree(tree);

      expect(result.properties.field).toEqual(str());
    });

    it('serializes string with foreignKey', () => {
      const root = createObjectNode('root', 'root', [
        createStringNode('field-id', 'userId', {
          defaultValue: '',
          foreignKey: 'users',
        }),
      ]);
      const tree = createSchemaTree(root);

      const result = serializer.serializeTree(tree);

      expect(result.properties.userId).toEqual(str({ foreignKey: 'users' }));
    });

    it('serializes string with formula', () => {
      const root = createObjectNode('root', 'root', [
        createStringNode('field-id', 'computed', {
          defaultValue: '',
          formula: createMockFormula(1, 'name + " " + surname'),
        }),
      ]);
      const tree = createSchemaTree(root);

      const result = serializer.serializeTree(tree);

      expect(result.properties.computed).toEqual(
        str({ readOnly: true, formula: 'name + " " + surname' }),
      );
    });
  });

  describe('number fields', () => {
    it('serializes number with default value', () => {
      const root = createObjectNode('root', 'root', [
        createNumberNode('field-id', 'count', { defaultValue: 42 }),
      ]);
      const tree = createSchemaTree(root);

      const result = serializer.serializeTree(tree);

      expect(result.properties.count).toEqual(num({ default: 42 }));
    });

    it('serializes number with zero default', () => {
      const root = createObjectNode('root', 'root', [
        createNumberNode('field-id', 'count'),
      ]);
      const tree = createSchemaTree(root);

      const result = serializer.serializeTree(tree);

      expect(result.properties.count).toEqual(num());
    });

    it('serializes number with formula', () => {
      const root = createObjectNode('root', 'root', [
        createNumberNode('field-id', 'total', {
          defaultValue: 0,
          formula: createMockFormula(1, 'price * quantity'),
        }),
      ]);
      const tree = createSchemaTree(root);

      const result = serializer.serializeTree(tree);

      expect(result.properties.total).toEqual(
        num({ readOnly: true, formula: 'price * quantity' }),
      );
    });
  });

  describe('boolean fields', () => {
    it('serializes boolean with default value', () => {
      const root = createObjectNode('root', 'root', [
        createBooleanNode('field-id', 'enabled', { defaultValue: true }),
      ]);
      const tree = createSchemaTree(root);

      const result = serializer.serializeTree(tree);

      expect(result.properties.enabled).toEqual(bool({ default: true }));
    });

    it('serializes boolean with false default', () => {
      const root = createObjectNode('root', 'root', [
        createBooleanNode('field-id', 'enabled'),
      ]);
      const tree = createSchemaTree(root);

      const result = serializer.serializeTree(tree);

      expect(result.properties.enabled).toEqual(bool());
    });

    it('serializes boolean with formula', () => {
      const root = createObjectNode('root', 'root', [
        createBooleanNode('field-id', 'isValid', {
          defaultValue: false,
          formula: createMockFormula(1, 'price > 0'),
        }),
      ]);
      const tree = createSchemaTree(root);

      const result = serializer.serializeTree(tree);

      expect(result.properties.isValid).toEqual(
        bool({ readOnly: true, formula: 'price > 0' }),
      );
    });
  });

  describe('array fields', () => {
    it('serializes array with string items', () => {
      const root = createObjectNode('root', 'root', [
        createArrayNode(
          'arr-id',
          'tags',
          createStringNode('items-id', '[*]', { defaultValue: '' }),
        ),
      ]);
      const tree = createSchemaTree(root);

      const result = serializer.serializeTree(tree);

      expect(result.properties.tags).toEqual(arr(str()));
    });

    it('serializes array with object items', () => {
      const root = createObjectNode('root', 'root', [
        createArrayNode(
          'arr-id',
          'items',
          createObjectNode('items-id', '[*]', [
            createStringNode('name-id', 'name', { defaultValue: '' }),
            createNumberNode('qty-id', 'quantity', { defaultValue: 0 }),
          ]),
        ),
      ]);
      const tree = createSchemaTree(root);

      const result = serializer.serializeTree(tree);

      expect(result.properties.items).toMatchObject(
        arr(obj({ name: str(), quantity: num() })),
      );
    });

    it('serializes nested arrays', () => {
      const root = createObjectNode('root', 'root', [
        createArrayNode(
          'outer-id',
          'matrix',
          createArrayNode(
            'inner-id',
            '[*]',
            createNumberNode('num-id', '[*]', { defaultValue: 0 }),
          ),
        ),
      ]);
      const tree = createSchemaTree(root);

      const result = serializer.serializeTree(tree);

      expect(result.properties.matrix).toEqual(arr(arr(num())));
    });
  });

  describe('ref fields', () => {
    it('serializes ref field', () => {
      const root = createObjectNode('root', 'root', [
        createRefNode('ref-id', 'file', 'File'),
      ]);
      const tree = createSchemaTree(root);

      const result = serializer.serializeTree(tree);

      expect(result.properties.file).toEqual(ref('File'));
    });

    it('serializes array of refs', () => {
      const root = createObjectNode('root', 'root', [
        createArrayNode(
          'arr-id',
          'files',
          createRefNode('ref-id', '[*]', 'File'),
        ),
      ]);
      const tree = createSchemaTree(root);

      const result = serializer.serializeTree(tree);

      expect(result.properties.files).toEqual(arr(ref('File')));
    });
  });

  describe('nested objects', () => {
    it('serializes nested object', () => {
      const root = createObjectNode('root', 'root', [
        createObjectNode('address-id', 'address', [
          createStringNode('street-id', 'street', { defaultValue: '' }),
          createStringNode('city-id', 'city', { defaultValue: '' }),
        ]),
      ]);
      const tree = createSchemaTree(root);

      const result = serializer.serializeTree(tree);

      expect(result.properties.address).toMatchObject({
        properties: { street: str(), city: str() },
      });
    });

    it('serializes deeply nested structure', () => {
      const root = createObjectNode('root', 'root', [
        createObjectNode('level1-id', 'level1', [
          createObjectNode('level2-id', 'level2', [
            createStringNode('value-id', 'value', { defaultValue: 'deep' }),
          ]),
        ]),
      ]);
      const tree = createSchemaTree(root);

      const result = serializer.serializeTree(tree);

      expect(result.properties.level1).toEqual(
        obj({
          level2: obj({ value: str({ default: 'deep' }) }),
        }),
      );
    });
  });

  describe('metadata', () => {
    it('serializes title', () => {
      const metadata: NodeMetadata = { title: 'User Name' };
      const root = createObjectNode('root', 'root', [
        createStringNode('field-id', 'name', { defaultValue: '', metadata }),
      ]);
      const tree = createSchemaTree(root);

      const result = serializer.serializeTree(tree);

      expect(result.properties.name).toEqual(str({ title: 'User Name' }));
    });

    it('serializes description', () => {
      const metadata: NodeMetadata = { description: 'The user full name' };
      const root = createObjectNode('root', 'root', [
        createStringNode('field-id', 'name', { defaultValue: '', metadata }),
      ]);
      const tree = createSchemaTree(root);

      const result = serializer.serializeTree(tree);

      expect(result.properties.name).toEqual(
        str({ description: 'The user full name' }),
      );
    });

    it('serializes deprecated flag', () => {
      const metadata: NodeMetadata = { deprecated: true };
      const root = createObjectNode('root', 'root', [
        createStringNode('field-id', 'oldField', { defaultValue: '', metadata }),
      ]);
      const tree = createSchemaTree(root);

      const result = serializer.serializeTree(tree);

      expect(result.properties.oldField).toEqual(str({ deprecated: true }));
    });

    it('serializes all metadata fields', () => {
      const metadata: NodeMetadata = {
        title: 'Legacy Field',
        description: 'This field is deprecated',
        deprecated: true,
      };
      const root = createObjectNode('root', 'root', [
        createStringNode('field-id', 'legacy', { defaultValue: '', metadata }),
      ]);
      const tree = createSchemaTree(root);

      const result = serializer.serializeTree(tree);

      expect(result.properties.legacy).toEqual(
        str({
          title: 'Legacy Field',
          description: 'This field is deprecated',
          deprecated: true,
        }),
      );
    });

    it('serializes metadata on root object', () => {
      const metadata: NodeMetadata = { title: 'User Schema', description: 'User data' };
      const root = createObjectNode('root', 'root', [], metadata);
      const tree = createSchemaTree(root);

      const result = serializer.serializeTree(tree);

      expect(result).toEqual(
        obj({}, { title: 'User Schema', description: 'User data' }),
      );
    });

    it('serializes metadata on array field', () => {
      const metadata: NodeMetadata = { title: 'Tags List' };
      const root = createObjectNode('root', 'root', [
        createArrayNode(
          'arr-id',
          'tags',
          createStringNode('items-id', '[*]', { defaultValue: '' }),
          metadata,
        ),
      ]);
      const tree = createSchemaTree(root);

      const result = serializer.serializeTree(tree);

      expect(result.properties.tags).toEqual(arr(str(), { title: 'Tags List' }));
    });

    it('serializes metadata on ref field', () => {
      const metadata: NodeMetadata = { title: 'Profile Picture' };
      const root = createObjectNode('root', 'root', [
        createRefNode('ref-id', 'avatar', 'File', metadata),
      ]);
      const tree = createSchemaTree(root);

      const result = serializer.serializeTree(tree);

      expect(result.properties.avatar).toEqual(
        ref('File', { title: 'Profile Picture' }),
      );
    });

    it('does not include undefined metadata fields', () => {
      const metadata: NodeMetadata = { title: 'Name' };
      const root = createObjectNode('root', 'root', [
        createStringNode('field-id', 'name', { defaultValue: '', metadata }),
      ]);
      const tree = createSchemaTree(root);

      const result = serializer.serializeTree(tree);
      const nameField = result.properties.name;

      expect(nameField).not.toHaveProperty('description');
      expect(nameField).not.toHaveProperty('deprecated');
    });
  });

  describe('serializeNode with options', () => {
    it('excludes specified node IDs', () => {
      const root = createObjectNode('root', 'root', [
        createStringNode('name-id', 'name', { defaultValue: '' }),
        createStringNode('secret-id', 'secret', { defaultValue: '' }),
        createNumberNode('age-id', 'age', { defaultValue: 0 }),
      ]);
      const tree = createSchemaTree(root);

      const result = serializer.serializeNode(tree.root(), tree, {
        excludeNodeIds: new Set(['secret-id']),
      });

      expect(result).toMatchObject({
        properties: { name: str(), age: num() },
      });
      expect((result as { required: string[] }).required).toEqual(['name', 'age']);
    });

    it('excludes multiple node IDs', () => {
      const root = createObjectNode('root', 'root', [
        createStringNode('field1-id', 'field1', { defaultValue: '' }),
        createStringNode('field2-id', 'field2', { defaultValue: '' }),
        createStringNode('field3-id', 'field3', { defaultValue: '' }),
      ]);
      const tree = createSchemaTree(root);

      const result = serializer.serializeNode(tree.root(), tree, {
        excludeNodeIds: new Set(['field1-id', 'field3-id']),
      });

      expect(result).toEqual(obj({ field2: str() }));
    });

    it('handles empty excludeNodeIds set', () => {
      const root = createObjectNode('root', 'root', [
        createStringNode('name-id', 'name', { defaultValue: '' }),
      ]);
      const tree = createSchemaTree(root);

      const result = serializer.serializeNode(tree.root(), tree, {
        excludeNodeIds: new Set(),
      });

      expect(result).toEqual(obj({ name: str() }));
    });

    it('excludes nested object properties', () => {
      const root = createObjectNode('root', 'root', [
        createObjectNode('obj-id', 'data', [
          createStringNode('visible-id', 'visible', { defaultValue: '' }),
          createStringNode('hidden-id', 'hidden', { defaultValue: '' }),
        ]),
      ]);
      const tree = createSchemaTree(root);

      const result = serializer.serializeNode(tree.root(), tree, {
        excludeNodeIds: new Set(['hidden-id']),
      });

      expect(result).toEqual(obj({ data: obj({ visible: str() }) }));
    });

    it('can exclude entire nested object', () => {
      const root = createObjectNode('root', 'root', [
        createStringNode('name-id', 'name', { defaultValue: '' }),
        createObjectNode('obj-id', 'private', [
          createStringNode('secret-id', 'secret', { defaultValue: '' }),
        ]),
      ]);
      const tree = createSchemaTree(root);

      const result = serializer.serializeNode(tree.root(), tree, {
        excludeNodeIds: new Set(['obj-id']),
      });

      expect(result).toEqual(obj({ name: str() }));
    });
  });

  describe('error handling', () => {
    it('throws on null node', () => {
      const root = createObjectNode('root', 'root', [
        createStringNode('name-id', 'name'),
      ]);
      const tree = createSchemaTree(root);
      const nullNode = tree.nodeById('non-existent');

      expect(() => {
        serializer.serializeNode(nullNode, tree);
      }).toThrow('Cannot serialize null node');
    });

    it('throws when array has null items', () => {
      const mockArrayNode = {
        id: () => 'arr-id',
        name: () => 'arr',
        nodeType: () => 'array' as const,
        metadata: () => ({}),
        isObject: () => false,
        isArray: () => true,
        isPrimitive: () => false,
        isRef: () => false,
        isNull: () => false,
        property: () => ({ isNull: () => true }),
        properties: () => [],
        items: () => ({ isNull: () => true }),
        ref: () => undefined,
        formula: () => undefined,
        hasFormula: () => false,
        defaultValue: () => undefined,
        foreignKey: () => undefined,
        clone: () => mockArrayNode,
      };

      const mockRoot = {
        id: () => 'root',
        name: () => 'root',
        nodeType: () => 'object' as const,
        metadata: () => ({}),
        isObject: () => true,
        isArray: () => false,
        isPrimitive: () => false,
        isRef: () => false,
        isNull: () => false,
        property: () => mockArrayNode,
        properties: () => [mockArrayNode],
        items: () => ({ isNull: () => true }),
        ref: () => undefined,
        formula: () => undefined,
        hasFormula: () => false,
        defaultValue: () => undefined,
        foreignKey: () => undefined,
        clone: () => mockRoot,
      };

      const mockTree = createSchemaTree(
        createObjectNode('root', 'root', [
          createStringNode('dummy', 'dummy'),
        ]),
      );

      expect(() => {
        serializer.serializeNode(mockArrayNode as unknown as ReturnType<typeof createObjectNode>, mockTree);
      }).toThrow('Array node must have items');
    });

    it('throws when ref has no ref value', () => {
      const mockRefNode = {
        id: () => 'ref-id',
        name: () => 'ref',
        nodeType: () => 'ref' as const,
        metadata: () => ({}),
        isObject: () => false,
        isArray: () => false,
        isPrimitive: () => false,
        isRef: () => true,
        isNull: () => false,
        property: () => ({ isNull: () => true }),
        properties: () => [],
        items: () => ({ isNull: () => true }),
        ref: () => undefined,
        formula: () => undefined,
        hasFormula: () => false,
        defaultValue: () => undefined,
        foreignKey: () => undefined,
        clone: () => mockRefNode,
      };

      const mockTree = createSchemaTree(
        createObjectNode('root', 'root', [
          createStringNode('dummy', 'dummy'),
        ]),
      );

      expect(() => {
        serializer.serializeNode(mockRefNode as unknown as ReturnType<typeof createObjectNode>, mockTree);
      }).toThrow('Ref node must have a ref value');
    });

    it('throws for unknown primitive type', () => {
      const mockNode = {
        id: () => 'unknown-id',
        name: () => 'unknown',
        nodeType: () => 'custom' as unknown as ReturnType<typeof createStringNode>['nodeType'],
        metadata: () => ({}),
        isObject: () => false,
        isArray: () => false,
        isPrimitive: () => true,
        isRef: () => false,
        isNull: () => false,
        property: () => ({ isNull: () => true }),
        properties: () => [],
        items: () => ({ isNull: () => true }),
        ref: () => undefined,
        formula: () => undefined,
        hasFormula: () => false,
        defaultValue: () => 'value',
        foreignKey: () => undefined,
        clone: () => mockNode,
      };

      const mockTree = createSchemaTree(
        createObjectNode('root', 'root', [
          createStringNode('dummy', 'dummy'),
        ]),
      );

      expect(() => {
        serializer.serializeNode(mockNode as unknown as ReturnType<typeof createObjectNode>, mockTree);
      }).toThrow('Unknown primitive type: custom');
    });
  });

  describe('complex schemas', () => {
    it('serializes complex e-commerce product schema', () => {
      const root = createObjectNode('root', 'root', [
        createStringNode('id-id', 'id', { defaultValue: '' }),
        createStringNode('name-id', 'name', {
          defaultValue: '',
          metadata: { title: 'Product Name' },
        }),
        createNumberNode('price-id', 'price', { defaultValue: 0 }),
        createNumberNode('quantity-id', 'quantity', { defaultValue: 0 }),
        createNumberNode('total-id', 'total', {
          defaultValue: 0,
          formula: createMockFormula(1, 'price * quantity'),
        }),
        createObjectNode('category-id', 'category', [
          createStringNode('cat-id-id', 'id', { defaultValue: '' }),
          createStringNode('cat-name-id', 'name', { defaultValue: '' }),
        ]),
        createArrayNode(
          'tags-id',
          'tags',
          createStringNode('tag-item-id', '[*]', { defaultValue: '' }),
        ),
        createRefNode('image-id', 'image', 'File'),
      ]);
      const tree = createSchemaTree(root);

      const result = serializer.serializeTree(tree);

      expect(result.type).toBe('object');
      expect(result.required).toEqual([
        'id',
        'name',
        'price',
        'quantity',
        'total',
        'category',
        'tags',
        'image',
      ]);
      expect(result.properties.total).toEqual(
        num({ readOnly: true, formula: 'price * quantity' }),
      );
      expect(result.properties.name).toEqual(
        str({ title: 'Product Name' }),
      );
      expect(result.properties.image).toEqual(ref('File'));
    });
  });
});
