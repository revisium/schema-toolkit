import type { JsonSchemaTypeName } from './schema.types.js';
import type {
  ArrayValueNode,
  ObjectValueNode,
  PrimitiveValueNode,
  ValueNode,
} from '../model/value-node/types.js';

// ---------------------------------------------------------------------------
// InferValue — maps a JSON Schema type to the plain TypeScript value it holds
// ---------------------------------------------------------------------------

export type InferValue<S> =
  S extends { readonly type: JsonSchemaTypeName.String } | { type: JsonSchemaTypeName.String }
    ? string
    : S extends { readonly type: 'string' } | { type: 'string' }
      ? string
      : S extends { readonly type: JsonSchemaTypeName.Number } | { type: JsonSchemaTypeName.Number }
        ? number
        : S extends { readonly type: 'number' } | { type: 'number' }
          ? number
          : S extends
                | { readonly type: JsonSchemaTypeName.Boolean }
                | { type: JsonSchemaTypeName.Boolean }
            ? boolean
            : S extends { readonly type: 'boolean' } | { type: 'boolean' }
              ? boolean
              : S extends {
                    readonly type: JsonSchemaTypeName.Object;
                    readonly properties: infer P;
                  }
                ? { [K in keyof P]: InferValue<P[K]> }
                : S extends { type: JsonSchemaTypeName.Object; readonly properties: infer P }
                  ? { [K in keyof P]: InferValue<P[K]> }
                  : S extends { readonly type: 'object'; readonly properties: infer P }
                    ? { [K in keyof P]: InferValue<P[K]> }
                    : S extends { type: 'object'; readonly properties: infer P }
                      ? { [K in keyof P]: InferValue<P[K]> }
                      : S extends { type: 'object'; properties: infer P }
                        ? { [K in keyof P]: InferValue<P[K]> }
                        : S extends {
                              readonly type: JsonSchemaTypeName.Array;
                              readonly items: infer I;
                            }
                          ? InferValue<I>[]
                          : S extends {
                                type: JsonSchemaTypeName.Array;
                                readonly items: infer I;
                              }
                            ? InferValue<I>[]
                            : S extends {
                                  readonly type: 'array';
                                  readonly items: infer I;
                                }
                              ? InferValue<I>[]
                              : S extends { type: 'array'; readonly items: infer I }
                                ? InferValue<I>[]
                                : S extends { type: 'array'; items: infer I }
                                  ? InferValue<I>[]
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
  getPlainValue(): InferValue<I>[];
  setValue(value: InferValue<I>[], options?: { internal?: boolean }): void;
}

// ---------------------------------------------------------------------------
// InferNode — maps a JSON Schema type to the typed ValueNode interface
// ---------------------------------------------------------------------------

export type InferNode<S> =
  S extends { readonly type: JsonSchemaTypeName.String } | { type: JsonSchemaTypeName.String }
    ? TypedPrimitiveValueNode<string>
    : S extends { readonly type: 'string' } | { type: 'string' }
      ? TypedPrimitiveValueNode<string>
      : S extends { readonly type: JsonSchemaTypeName.Number } | { type: JsonSchemaTypeName.Number }
        ? TypedPrimitiveValueNode<number>
        : S extends { readonly type: 'number' } | { type: 'number' }
          ? TypedPrimitiveValueNode<number>
          : S extends
                | { readonly type: JsonSchemaTypeName.Boolean }
                | { type: JsonSchemaTypeName.Boolean }
            ? TypedPrimitiveValueNode<boolean>
            : S extends { readonly type: 'boolean' } | { type: 'boolean' }
              ? TypedPrimitiveValueNode<boolean>
              : S extends {
                    readonly type: JsonSchemaTypeName.Object;
                    readonly properties: infer P;
                  }
                ? TypedObjectValueNode<P>
                : S extends {
                      type: JsonSchemaTypeName.Object;
                      readonly properties: infer P;
                    }
                  ? TypedObjectValueNode<P>
                  : S extends { readonly type: 'object'; readonly properties: infer P }
                    ? TypedObjectValueNode<P>
                    : S extends { type: 'object'; readonly properties: infer P }
                      ? TypedObjectValueNode<P>
                      : S extends { type: 'object'; properties: infer P }
                        ? TypedObjectValueNode<P>
                        : S extends {
                              readonly type: JsonSchemaTypeName.Array;
                              readonly items: infer I;
                            }
                          ? TypedArrayValueNode<I>
                          : S extends {
                                type: JsonSchemaTypeName.Array;
                                readonly items: infer I;
                              }
                            ? TypedArrayValueNode<I>
                            : S extends { readonly type: 'array'; readonly items: infer I }
                              ? TypedArrayValueNode<I>
                              : S extends { type: 'array'; readonly items: infer I }
                                ? TypedArrayValueNode<I>
                                : S extends { type: 'array'; items: infer I }
                                  ? TypedArrayValueNode<I>
                                  : ValueNode;

// ---------------------------------------------------------------------------
// Path string types — SchemaPaths, SchemaAtPath, NodeAtPath, ValueAtPath
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

type IsPrimitive<S> = SchemaType<S> extends 'string' | 'number' | 'boolean' ? true : false;

export type SchemaPaths<S, Prefix extends string = ''> =
  IsPrimitive<S> extends true
    ? never
    : SchemaType<S> extends 'object' | JsonSchemaTypeName.Object
      ? {
          [K in keyof SchemaProperties<S> & string]:
            | `${Prefix}${K}`
            | SchemaPaths<SchemaProperties<S>[K], `${Prefix}${K}.`>;
        }[keyof SchemaProperties<S> & string]
      : SchemaType<S> extends 'array' | JsonSchemaTypeName.Array
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
