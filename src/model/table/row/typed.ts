import type { JsonSchema } from '../../../types/schema.types.js';
import type {
  InferNode,
  InferValue,
  NodeAtPath,
  SchemaPaths,
  ValueAtPath,
} from '../../../types/typed.js';
import type { RowModel, RowModelOptions } from './types.js';

export interface TypedRowModel<S> extends RowModel {
  readonly root: InferNode<S>;
  get<P extends SchemaPaths<S>>(path: P): NodeAtPath<S, P>;
  getValue<P extends SchemaPaths<S>>(path: P): ValueAtPath<S, P>;
  setValue<P extends SchemaPaths<S>>(path: P, value: ValueAtPath<S, P>): void;
  getPlainValue(): InferValue<S>;
  reset(data?: InferValue<S>): void;
}

export interface TypedRowModelOptions<S extends JsonSchema> extends Omit<RowModelOptions, 'schema' | 'data'> {
  schema: S;
  data?: InferValue<S>;
}
