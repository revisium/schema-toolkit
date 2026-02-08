import type { JsonSchema } from '../../../types/schema.types.js';
import type {
  InferValue,
  NodeAtPath,
  SchemaPaths,
  ValueAtPath,
} from '../../../types/typed.js';
import type { RowModel, RowModelOptions } from './types.js';

export interface TypedRowModel<S> extends RowModel {
  get<P extends SchemaPaths<S>>(path: P): NodeAtPath<S, P>;
  getValue<P extends SchemaPaths<S>>(path: P): ValueAtPath<S, P>;
  setValue<P extends SchemaPaths<S>>(path: P, value: ValueAtPath<S, P>): void;
  getPlainValue(): InferValue<S>;
}

export interface TypedRowModelOptions<S extends JsonSchema> extends Omit<RowModelOptions, 'schema' | 'data'> {
  schema: S;
  data?: InferValue<S>;
}
