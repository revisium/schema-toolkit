import { str, num, bool, obj, arr } from '../../lib/schema-helpers.js';
import { JsonSchemaTypeName } from '../schema.types.js';
import type {
  InferValue,
  InferNode,
  TypedPrimitiveValueNode,
  TypedObjectValueNode,
  TypedArrayValueNode,
  SchemaPaths,
  SchemaAtPath,
  ValueAtPath,
  SchemaFromValue,
  NodeFromValue,
  ValuePaths,
} from '../typed.js';
import type { ValueNode } from '../../model/value-node/types.js';
import type { TypedValueTree } from '../../model/value-tree/typed.js';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function assert<_T extends true>() {}
type Equal<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
type Extends<A, B> = A extends B ? true : false;

describe('typed API — compile-time type assertions', () => {
  describe('InferValue', () => {
    it('maps string schema to string', () => {
      assert<Equal<InferValue<ReturnType<typeof str>>, string>>();
    });

    it('maps number schema to number', () => {
      assert<Equal<InferValue<ReturnType<typeof num>>, number>>();
    });

    it('maps boolean schema to boolean', () => {
      assert<Equal<InferValue<ReturnType<typeof bool>>, boolean>>();
    });

    it('maps object schema to typed object', () => {
      expect(obj({ name: str(), age: num() }).type).toBe(JsonSchemaTypeName.Object);
      assert<Equal<InferValue<ReturnType<typeof obj<{ name: ReturnType<typeof str>; age: ReturnType<typeof num> }>>>, { name: string; age: number }>>();
    });

    it('maps array schema to typed array', () => {
      expect(arr(str()).type).toBe(JsonSchemaTypeName.Array);
      assert<Equal<InferValue<ReturnType<typeof arr<ReturnType<typeof str>>>>, string[]>>();
    });

    it('maps nested object schema', () => {
      const schema = obj({
        address: obj({ city: str(), zip: str() }),
        tags: arr(str()),
      });
      expect(schema.type).toBe(JsonSchemaTypeName.Object);
      assert<
        Equal<InferValue<typeof schema>, { address: { city: string; zip: string }; tags: string[] }>
      >();
    });

    it('maps plain object literal schema with as const', () => {
      const schema = {
        type: 'string' as const,
        default: '',
      };
      expect(schema.type).toBe('string');
      assert<Equal<InferValue<typeof schema>, string>>();
    });

    it('maps plain object literal for object schema with as const', () => {
      const schema = {
        type: 'object' as const,
        additionalProperties: false as const,
        required: ['name'] as string[],
        properties: {
          name: { type: 'string' as const, default: '' },
        },
      };
      expect(schema.type).toBe('object');
      assert<Equal<InferValue<typeof schema>, { name: string }>>();
    });

    it('maps plain object literal for array schema with as const', () => {
      const schema = {
        type: 'array' as const,
        items: { type: 'number' as const, default: 0 },
      };
      expect(schema.type).toBe('array');
      assert<Equal<InferValue<typeof schema>, number[]>>();
    });
  });

  describe('InferNode', () => {
    it('maps string schema to TypedPrimitiveValueNode<string>', () => {
      assert<Equal<InferNode<ReturnType<typeof str>>, TypedPrimitiveValueNode<string>>>();
    });

    it('maps number schema to TypedPrimitiveValueNode<number>', () => {
      assert<Equal<InferNode<ReturnType<typeof num>>, TypedPrimitiveValueNode<number>>>();
    });

    it('maps boolean schema to TypedPrimitiveValueNode<boolean>', () => {
      assert<Equal<InferNode<ReturnType<typeof bool>>, TypedPrimitiveValueNode<boolean>>>();
    });

    it('maps object schema to TypedObjectValueNode', () => {
      const schema = obj({ name: str() });
      expect(schema.type).toBe(JsonSchemaTypeName.Object);
      type Props = (typeof schema)['properties'];
      assert<Equal<InferNode<typeof schema>, TypedObjectValueNode<Props>>>();
    });

    it('maps array schema to TypedArrayValueNode', () => {
      const schema = arr(num());
      expect(schema.type).toBe(JsonSchemaTypeName.Array);
      type Items = (typeof schema)['items'];
      assert<Equal<InferNode<typeof schema>, TypedArrayValueNode<Items>>>();
    });

    it('falls back to ValueNode for unknown schemas', () => {
      assert<Equal<InferNode<{ $ref: string }>, ValueNode>>();
    });
  });

  describe('typed node interface contracts', () => {
    it('TypedObjectValueNode.child returns narrowed type for specific key', () => {
      const schema = obj({ name: str(), count: num() });
      expect(schema.type).toBe(JsonSchemaTypeName.Object);
      type Props = (typeof schema)['properties'];
      assert<Equal<InferNode<Props['name']>, TypedPrimitiveValueNode<string>>>();
      assert<Equal<InferNode<Props['count']>, TypedPrimitiveValueNode<number>>>();
    });

    it('TypedObjectValueNode.getPlainValue returns typed object', () => {
      const schema = obj({ flag: bool(), label: str() });
      expect(schema.type).toBe(JsonSchemaTypeName.Object);
      type Props = (typeof schema)['properties'];
      type Node = TypedObjectValueNode<Props>;
      type Value = ReturnType<Node['getPlainValue']>;
      assert<Equal<Value, { flag: boolean; label: string }>>();
    });

    it('TypedArrayValueNode.at returns element node type', () => {
      type Node = TypedArrayValueNode<ReturnType<typeof str>>;
      type Item = ReturnType<Node['at']>;
      assert<Equal<Item, TypedPrimitiveValueNode<string> | undefined>>();
    });

    it('TypedArrayValueNode.getPlainValue returns typed array', () => {
      type Node = TypedArrayValueNode<ReturnType<typeof num>>;
      type Value = ReturnType<Node['getPlainValue']>;
      assert<Equal<Value, number[]>>();
    });
  });

  describe('SchemaPaths', () => {
    it('generates top-level property paths', () => {
      const schema = obj({ name: str(), age: num() });
      expect(schema.type).toBe(JsonSchemaTypeName.Object);
      type Paths = SchemaPaths<typeof schema>;
      assert<Extends<'name', Paths>>();
      assert<Extends<'age', Paths>>();
    });

    it('generates nested property paths', () => {
      const schema = obj({
        address: obj({ city: str(), zip: str() }),
      });
      expect(schema.type).toBe(JsonSchemaTypeName.Object);
      type Paths = SchemaPaths<typeof schema>;
      assert<Extends<'address', Paths>>();
      assert<Extends<'address.city', Paths>>();
      assert<Extends<'address.zip', Paths>>();
    });

    it('generates array index paths', () => {
      const schema = obj({ tags: arr(str()) });
      expect(schema.type).toBe(JsonSchemaTypeName.Object);
      type Paths = SchemaPaths<typeof schema>;
      assert<Extends<'tags', Paths>>();
      assert<Extends<`tags.[${number}]`, Paths>>();
    });
  });

  describe('SchemaAtPath', () => {
    it('resolves top-level property schema', () => {
      const schema = obj({ name: str(), age: num() });
      expect(schema.type).toBe(JsonSchemaTypeName.Object);
      assert<Equal<SchemaAtPath<typeof schema, 'name'>, ReturnType<typeof str>>>();
    });

    it('resolves nested property schema', () => {
      const schema = obj({
        address: obj({ city: str() }),
      });
      expect(schema.type).toBe(JsonSchemaTypeName.Object);
      assert<Equal<SchemaAtPath<typeof schema, 'address.city'>, ReturnType<typeof str>>>();
    });
  });

  describe('ValueAtPath', () => {
    it('resolves value type at path', () => {
      const schema = obj({ age: num() });
      expect(schema.type).toBe(JsonSchemaTypeName.Object);
      assert<Equal<ValueAtPath<typeof schema, 'age'>, number>>();
    });

    it('resolves nested value type', () => {
      const schema = obj({
        address: obj({ city: str() }),
      });
      expect(schema.type).toBe(JsonSchemaTypeName.Object);
      assert<Equal<ValueAtPath<typeof schema, 'address.city'>, string>>();
    });
  });

  describe('TypedValueTree interface', () => {
    it('root is typed', () => {
      const schema = obj({ name: str() });
      expect(schema.type).toBe(JsonSchemaTypeName.Object);
      type Tree = TypedValueTree<typeof schema>;
      type RootType = Tree['root'];
      type Props = (typeof schema)['properties'];
      assert<Equal<RootType, TypedObjectValueNode<Props>>>();
    });
  });

  describe('plain object schemas (without helpers)', () => {
    it('works with as const object schema', () => {
      const schema = {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'age'],
        properties: {
          name: { type: 'string', default: '' },
          age: { type: 'number', default: 0 },
        },
      } as const;
      expect(schema.type).toBe('object');
      assert<Equal<InferValue<typeof schema>, { name: string; age: number }>>();
    });

    it('works with as const nested schema', () => {
      const schema = {
        type: 'object',
        additionalProperties: false,
        required: ['address'],
        properties: {
          address: {
            type: 'object',
            additionalProperties: false,
            required: ['city'],
            properties: {
              city: { type: 'string', default: '' },
            },
          },
        },
      } as const;
      expect(schema.type).toBe('object');
      assert<Equal<InferValue<typeof schema>, { address: { city: string } }>>();
    });

    it('works with as const array schema', () => {
      const schema = {
        type: 'object',
        additionalProperties: false,
        required: ['tags'],
        properties: {
          tags: {
            type: 'array',
            items: { type: 'string', default: '' },
          },
        },
      } as const;
      expect(schema.type).toBe('object');
      assert<Equal<InferValue<typeof schema>, { tags: string[] }>>();
    });

    it('InferNode works with as const primitives', () => {
      const strSchema = { type: 'string', default: '' } as const;
      expect(strSchema.type).toBe('string');
      assert<Equal<InferNode<typeof strSchema>, TypedPrimitiveValueNode<string>>>();
    });

    it('SchemaPaths works with as const schema', () => {
      const schema = {
        type: 'object',
        additionalProperties: false,
        required: ['name'],
        properties: {
          name: { type: 'string', default: '' },
        },
      } as const;
      expect(schema.type).toBe('object');
      assert<Extends<'name', SchemaPaths<typeof schema>>>();
    });

    it('SchemaAtPath works with as const schema', () => {
      const schema = {
        type: 'object',
        additionalProperties: false,
        required: ['name'],
        properties: {
          name: { type: 'string', default: '' },
        },
      } as const;
      expect(schema.type).toBe('object');
      assert<Equal<ValueAtPath<typeof schema, 'name'>, string>>();
    });

    it('works with manually typed schema interface', () => {
      type MySchema = {
        type: 'object';
        additionalProperties: false;
        required: string[];
        properties: {
          name: { type: 'string'; default: '' };
          age: { type: 'number'; default: 0 };
          active: { type: 'boolean'; default: false };
        };
      };

      assert<Equal<InferValue<MySchema>, { name: string; age: number; active: boolean }>>();
    });
  });

  describe('SchemaFromValue', () => {
    it('maps string to string schema', () => {
      assert<Equal<SchemaFromValue<string>, { type: 'string' }>>();
    });

    it('maps number to number schema', () => {
      assert<Equal<SchemaFromValue<number>, { type: 'number' }>>();
    });

    it('maps boolean to boolean schema', () => {
      assert<Equal<SchemaFromValue<boolean>, { type: 'boolean' }>>();
    });

    it('maps flat object to object schema', () => {
      type T = { name: string; age: number };
      type S = SchemaFromValue<T>;
      assert<Equal<InferValue<S>, T>>();
    });

    it('maps nested object to nested object schema', () => {
      type T = { address: { city: string; zip: string } };
      type S = SchemaFromValue<T>;
      assert<Equal<InferValue<S>, T>>();
    });

    it('maps array to array schema', () => {
      type T = string[];
      type S = SchemaFromValue<T>;
      assert<Equal<InferValue<S>, T>>();
    });

    it('maps complex nested structure', () => {
      type T = {
        firstName: string;
        age: number;
        active: boolean;
        nested: { value: number };
        tags: string[];
      };
      type S = SchemaFromValue<T>;
      assert<Equal<InferValue<S>, T>>();
    });

    it('roundtrips with InferValue', () => {
      type Original = { x: number; y: { z: boolean } };
      assert<Equal<InferValue<SchemaFromValue<Original>>, Original>>();
    });
  });

  describe('NodeFromValue', () => {
    it('maps string to TypedPrimitiveValueNode<string>', () => {
      assert<Equal<NodeFromValue<string>, TypedPrimitiveValueNode<string>>>();
    });

    it('maps number to TypedPrimitiveValueNode<number>', () => {
      assert<Equal<NodeFromValue<number>, TypedPrimitiveValueNode<number>>>();
    });

    it('maps object to TypedObjectValueNode', () => {
      type T = { name: string };
      type Node = NodeFromValue<T>;
      type Props = SchemaFromValue<T>['properties'];
      assert<Equal<Node, TypedObjectValueNode<Props>>>();
    });
  });

  describe('ValuePaths', () => {
    it('generates paths from value type', () => {
      type T = { name: string; address: { city: string } };
      type Paths = ValuePaths<T>;
      assert<Extends<'name', Paths>>();
      assert<Extends<'address', Paths>>();
      assert<Extends<'address.city', Paths>>();
    });

    it('generates array paths from value type', () => {
      type T = { tags: string[] };
      type Paths = ValuePaths<T>;
      assert<Extends<'tags', Paths>>();
      assert<Extends<`tags.[${number}]`, Paths>>();
    });
  });

  describe('TypedRowModel type contracts', () => {
    it('typed row model narrows getValue return type', () => {
      const schema = obj({ name: str(), age: num() });
      expect(schema.type).toBe(JsonSchemaTypeName.Object);
      type Row = import('../../model/table/row/typed.js').TypedRowModel<typeof schema>;
      type NameValue = ReturnType<Row['getValue']>;

      assert<Extends<string, NameValue>>();
      assert<Extends<number, NameValue>>();
    });

    it('typed row model narrows getPlainValue return type', () => {
      const schema = obj({ name: str(), count: num() });
      expect(schema.type).toBe(JsonSchemaTypeName.Object);
      type Row = import('../../model/table/row/typed.js').TypedRowModel<typeof schema>;
      type Value = ReturnType<Row['getPlainValue']>;
      assert<Equal<Value, { name: string; count: number }>>();
    });
  });

  describe('TypedTableModel type contracts', () => {
    it('typed table model returns typed rows', () => {
      const schema = obj({ title: str() });
      expect(schema.type).toBe(JsonSchemaTypeName.Object);
      type Table = import('../../model/table/typed.js').TypedTableModel<typeof schema>;
      type Row = Table['rows'][number];
      type Value = ReturnType<Row['getPlainValue']>;
      assert<Equal<Value, { title: string }>>();
    });

    it('typed table model addRow returns typed row', () => {
      const schema = obj({ price: num() });
      expect(schema.type).toBe(JsonSchemaTypeName.Object);
      type Table = import('../../model/table/typed.js').TypedTableModel<typeof schema>;
      type Row = ReturnType<Table['addRow']>;
      type Value = ReturnType<Row['getPlainValue']>;
      assert<Equal<Value, { price: number }>>();
    });
  });
});
