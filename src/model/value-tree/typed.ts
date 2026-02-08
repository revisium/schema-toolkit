import type { JsonSchema } from '../../types/schema.types.js';
import type {
  InferNode,
  InferValue,
  NodeAtPath,
  SchemaPaths,
  ValueAtPath,
} from '../../types/typed.js';
import type { NodeFactoryOptions } from '../value-node/NodeFactory.js';
import type { ValueNode } from '../value-node/types.js';
import { createNodeFactory } from '../value-node/NodeFactory.js';
import { ValueTree } from './ValueTree.js';
import type { ValueTreeLike } from './types.js';

export interface TypedValueTree<S> extends ValueTreeLike {
  readonly root: InferNode<S>;
  get<P extends SchemaPaths<S>>(path: P): NodeAtPath<S, P>;
  getValue<P extends SchemaPaths<S>>(path: P): ValueAtPath<S, P>;
  setValue<P extends SchemaPaths<S>>(
    path: P,
    value: ValueAtPath<S, P>,
    options?: { internal?: boolean },
  ): void;
}

export function typedNode<S extends JsonSchema>(node: ValueNode): InferNode<S> {
  return node as InferNode<S>;
}

export function createTypedTree<const S extends JsonSchema>(
  schema: S,
  data: InferValue<S>,
  options?: NodeFactoryOptions,
): TypedValueTree<S> {
  const factory = createNodeFactory(options);
  const root = factory.createTree(schema, data);
  return new ValueTree(root) as unknown as TypedValueTree<S>;
}
