import type {
  ArrayValueNode,
  ObjectValueNode,
  PrimitiveValueNode,
  ValueNode,
} from '../model/value-node/types.js';

// ---------------------------------------------------------------------------
// Schema field extractors — handle readonly / non-readonly uniformly
// ---------------------------------------------------------------------------

type SchemaType<S> = S extends { readonly type: infer T } ? T : S extends { type: infer T } ? T : never;

type SchemaProperties<S> = S extends { readonly properties: infer P }
  ? P
  : S extends { properties: infer P }
    ? P
    : never;

type SchemaItems<S> = S extends { readonly items: infer I }
  ? I
  : S extends { items: infer I }
    ? I
    : never;

type IsNever<T> = [T] extends [never] ? true : false;
type IsPrimitive<S> = IsNever<SchemaType<S>> extends true ? false : SchemaType<S> extends 'string' | 'number' | 'boolean' ? true : false;

// ---------------------------------------------------------------------------
// InferValue — maps a JSON Schema type to the plain TypeScript value it holds
// ---------------------------------------------------------------------------

type PrimitiveValue<T> = T extends 'string'
  ? string
  : T extends 'number'
    ? number
    : T extends 'boolean'
      ? boolean
      : never;

export type InferValue<S> =
  IsNever<SchemaType<S>> extends true
    ? unknown
    : IsPrimitive<S> extends true
      ? PrimitiveValue<SchemaType<S>>
      : SchemaType<S> extends 'object'
        ? { [K in keyof SchemaProperties<S>]: InferValue<SchemaProperties<S>[K]> }
        : SchemaType<S> extends 'array'
          ? InferValue<SchemaItems<S>>[]
          : unknown;

// ---------------------------------------------------------------------------
// Typed node interfaces — extend untyped interfaces, narrow return types
// ---------------------------------------------------------------------------

export interface TypedPrimitiveValueNode<T extends string | number | boolean>
  extends PrimitiveValueNode {
  readonly value: T;
  readonly baseValue: T;
  getPlainValue(): T;
  setValue(value: T, options?: { internal?: boolean }): void;
}

export interface TypedObjectValueNode<P> extends ObjectValueNode {
  child<K extends keyof P & string>(name: K): InferNode<P[K]>;
  getPlainValue(): { [K in keyof P]: InferValue<P[K]> };
  setValue(
    value: Partial<{ [K in keyof P]: InferValue<P[K]> }>,
    options?: { internal?: boolean },
  ): void;
}

export interface TypedArrayValueNode<I> extends ArrayValueNode {
  at(index: number): InferNode<I> | undefined;
  find(predicate: (node: InferNode<I>, index: number) => boolean): InferNode<I> | undefined;
  findIndex(predicate: (node: InferNode<I>, index: number) => boolean): number;
  getPlainValue(): InferValue<I>[];
  setValue(value: InferValue<I>[], options?: { internal?: boolean }): void;
}

// ---------------------------------------------------------------------------
// InferNode — maps a JSON Schema type to the typed ValueNode interface
// ---------------------------------------------------------------------------

type PrimitiveNode<T> = T extends 'string'
  ? TypedPrimitiveValueNode<string>
  : T extends 'number'
    ? TypedPrimitiveValueNode<number>
    : T extends 'boolean'
      ? TypedPrimitiveValueNode<boolean>
      : never;

export type InferNode<S> =
  IsNever<SchemaType<S>> extends true
    ? ValueNode
    : IsPrimitive<S> extends true
      ? PrimitiveNode<SchemaType<S>>
      : SchemaType<S> extends 'object'
        ? TypedObjectValueNode<SchemaProperties<S>>
        : SchemaType<S> extends 'array'
          ? TypedArrayValueNode<SchemaItems<S>>
          : ValueNode;

// ---------------------------------------------------------------------------
// Path string types — SchemaPaths, SchemaAtPath, NodeAtPath, ValueAtPath
// ---------------------------------------------------------------------------

export type SchemaPaths<S, Prefix extends string = ''> =
  IsPrimitive<S> extends true
    ? never
    : SchemaType<S> extends 'object'
      ? {
          [K in keyof SchemaProperties<S> & string]:
            | `${Prefix}${K}`
            | SchemaPaths<SchemaProperties<S>[K], `${Prefix}${K}.`>;
        }[keyof SchemaProperties<S> & string]
      : SchemaType<S> extends 'array'
        ? `${Prefix}[${number}]` | SchemaPaths<SchemaItems<S>, `${Prefix}[${number}].`>
        : never;

export type SchemaAtPath<S, Path extends string> = Path extends `${infer Key}.${infer Rest}`
  ? Key extends `[${string}]`
    ? SchemaAtPath<SchemaItems<S>, Rest>
    : SchemaAtPath<
        Key extends keyof SchemaProperties<S> ? SchemaProperties<S>[Key] : never,
        Rest
      >
  : Path extends `[${string}]`
    ? SchemaItems<S>
    : Path extends keyof SchemaProperties<S>
      ? SchemaProperties<S>[Path]
      : never;

export type NodeAtPath<S, Path extends string> = InferNode<SchemaAtPath<S, Path>>;
export type ValueAtPath<S, Path extends string> = InferValue<SchemaAtPath<S, Path>>;

// ---------------------------------------------------------------------------
// SchemaFromValue — maps a plain TS value type to a virtual schema shape
// ---------------------------------------------------------------------------

type SchemaFromPrimitive<T> = T extends string
  ? { type: 'string' }
  : T extends number
    ? { type: 'number' }
    : T extends boolean
      ? { type: 'boolean' }
      : never;

export type SchemaFromValue<T> = T extends string | number | boolean
  ? SchemaFromPrimitive<T>
  : T extends (infer E)[]
    ? { type: 'array'; items: SchemaFromValue<E> }
    : T extends Record<string, unknown>
      ? { type: 'object'; properties: { [K in keyof T]: SchemaFromValue<T[K]> } }
      : never;

// ---------------------------------------------------------------------------
// Value-type aware node / path helpers (accept plain TS value types)
// ---------------------------------------------------------------------------

export type NodeFromValue<T> = InferNode<SchemaFromValue<T>>;
export type ValuePaths<T> = SchemaPaths<SchemaFromValue<T>>;
