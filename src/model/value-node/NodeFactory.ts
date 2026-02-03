import type { ReactivityAdapter } from '../../core/reactivity/types.js';
import type {
  JsonArraySchema,
  JsonObjectSchema,
  JsonRefSchema,
  JsonSchema,
  JsonStringSchema,
} from '../../types/schema.types.js';
import type { ForeignKeyResolver } from '../foreign-key-resolver/ForeignKeyResolver.js';
import { ArrayValueNode } from './ArrayValueNode.js';
import { BooleanValueNode } from './BooleanValueNode.js';
import { ForeignKeyValueNodeImpl } from './ForeignKeyValueNode.js';
import { NumberValueNode } from './NumberValueNode.js';
import { ObjectValueNode } from './ObjectValueNode.js';
import { StringValueNode } from './StringValueNode.js';
import type { ValueNode } from './types.js';

export type NodeFactoryFn = (
  name: string,
  schema: JsonSchema,
  value: unknown,
  id?: string,
) => ValueNode;

export class NodeFactoryRegistry {
  private readonly factories = new Map<string, NodeFactoryFn>();

  register(schemaType: string, factory: NodeFactoryFn): this {
    this.factories.set(schemaType, factory);
    return this;
  }

  get(schemaType: string): NodeFactoryFn | undefined {
    return this.factories.get(schemaType);
  }

  has(schemaType: string): boolean {
    return this.factories.has(schemaType);
  }
}

export type RefSchemas = Record<string, JsonSchema>;

export interface NodeFactoryOptions {
  refSchemas?: RefSchemas;
  reactivity?: ReactivityAdapter;
  fkResolver?: ForeignKeyResolver;
}

export class NodeFactory {
  private readonly refSchemas: RefSchemas | undefined;

  constructor(
    private readonly registry: NodeFactoryRegistry,
    options?: NodeFactoryOptions,
  ) {
    this.refSchemas = options?.refSchemas;
  }

  create(
    name: string,
    schema: JsonSchema,
    value: unknown,
    id?: string,
  ): ValueNode {
    const resolvedSchema = this.resolveSchema(schema);
    const schemaType = this.getSchemaType(resolvedSchema);
    const factory = this.registry.get(schemaType);

    if (!factory) {
      throw new Error(`Unknown schema type: ${schemaType}`);
    }

    return factory(name, resolvedSchema, value, id);
  }

  createTree(schema: JsonSchema, value: unknown): ValueNode {
    return this.create('', schema, value);
  }

  private getSchemaType(schema: JsonSchema): string {
    if ('type' in schema) {
      return schema.type;
    }
    return 'object';
  }

  private resolveSchema(schema: JsonSchema): JsonSchema {
    if (!('$ref' in schema) || !this.refSchemas) {
      return schema;
    }

    const refSchema: JsonRefSchema = schema;
    const resolved = this.refSchemas[refSchema.$ref];
    if (!resolved) {
      return schema;
    }

    return {
      ...resolved,
      $ref: refSchema.$ref,
      title: refSchema.title ?? ('title' in resolved ? resolved.title : undefined),
      description:
        refSchema.description ??
        ('description' in resolved ? resolved.description : undefined),
      deprecated:
        refSchema.deprecated ??
        ('deprecated' in resolved ? resolved.deprecated : undefined),
    } as JsonSchema;
  }
}

function createStringFactory(
  reactivity?: ReactivityAdapter,
  fkResolver?: ForeignKeyResolver,
): NodeFactoryFn {
  return (name, schema, value, id) => {
    const stringSchema = schema as JsonStringSchema;
    if (stringSchema.foreignKey) {
      return new ForeignKeyValueNodeImpl(
        id,
        name,
        schema,
        value as string | undefined,
        reactivity,
        fkResolver,
      );
    }

    return new StringValueNode(
      id,
      name,
      schema,
      value as string | undefined,
      reactivity,
    );
  };
}

function createNumberFactory(reactivity?: ReactivityAdapter): NodeFactoryFn {
  return (name, schema, value, id) => {
    return new NumberValueNode(
      id,
      name,
      schema,
      value as number | undefined,
      reactivity,
    );
  };
}

function createBooleanFactory(reactivity?: ReactivityAdapter): NodeFactoryFn {
  return (name, schema, value, id) => {
    return new BooleanValueNode(
      id,
      name,
      schema,
      value as boolean | undefined,
      reactivity,
    );
  };
}

function createObjectFactory(
  nodeFactory: NodeFactory,
  reactivity?: ReactivityAdapter,
): NodeFactoryFn {
  return (name, schema, value, id) => {
    const objValue = (value ?? {}) as Record<string, unknown>;
    const children: ValueNode[] = [];

    const objectSchema = schema as JsonObjectSchema;
    const properties = objectSchema.properties ?? {};
    for (const [propName, propSchema] of Object.entries(properties)) {
      const propValue = objValue[propName];
      const childNode = nodeFactory.create(propName, propSchema, propValue);
      children.push(childNode);
    }

    return new ObjectValueNode(id, name, schema, children, reactivity);
  };
}

function createArrayFactory(
  nodeFactory: NodeFactory,
  reactivity?: ReactivityAdapter,
): NodeFactoryFn {
  return (name, schema, value, id) => {
    const arrValue = (value ?? []) as unknown[];
    const arraySchema = schema as JsonArraySchema;
    const itemSchema = arraySchema.items ?? { type: 'string', default: '' };
    const items: ValueNode[] = [];

    for (let i = 0; i < arrValue.length; i++) {
      const itemValue = arrValue[i];
      const itemNode = nodeFactory.create(String(i), itemSchema, itemValue);
      items.push(itemNode);
    }

    const arrayNode = new ArrayValueNode(id, name, schema, items, reactivity);
    arrayNode.setNodeFactory(nodeFactory);

    return arrayNode;
  };
}

export function createDefaultRegistry(
  reactivity?: ReactivityAdapter,
  fkResolver?: ForeignKeyResolver,
): NodeFactoryRegistry {
  const registry = new NodeFactoryRegistry();

  registry.register('string', createStringFactory(reactivity, fkResolver));
  registry.register('number', createNumberFactory(reactivity));
  registry.register('boolean', createBooleanFactory(reactivity));

  return registry;
}

export function createNodeFactory(options?: NodeFactoryOptions): NodeFactory {
  const registry = createDefaultRegistry(options?.reactivity, options?.fkResolver);
  const factory = new NodeFactory(registry, options);

  registry.register('object', createObjectFactory(factory, options?.reactivity));
  registry.register('array', createArrayFactory(factory, options?.reactivity));

  return factory;
}
