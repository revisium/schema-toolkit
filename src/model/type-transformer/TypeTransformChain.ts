import type { SchemaNode } from '../../core/schema-node/index.js';
import type {
  TypeTransformer,
  TransformContext,
  TransformResult,
  FieldTypeSpec,
  FieldSchemaSpec,
  SimpleFieldType,
} from './types.js';
import type { RefSchemas } from '../schema-model/types.js';
import {
  PrimitiveToArrayTransformer,
  ObjectToArrayTransformer,
  ArrayToItemsTypeTransformer,
  RefTransformer,
  DefaultTransformer,
} from './transformers/index.js';

export interface TypeTransformChainOptions {
  refSchemas?: RefSchemas;
  customTransformers?: TypeTransformer[];
}

export class TypeTransformChain {
  private readonly _transformers: TypeTransformer[];
  private readonly _refSchemas: RefSchemas | undefined;

  constructor(options: TypeTransformChainOptions = {}) {
    this._refSchemas = options.refSchemas;
    this._transformers = [
      ...(options.customTransformers ?? []),
      new PrimitiveToArrayTransformer(),
      new ObjectToArrayTransformer(),
      new ArrayToItemsTypeTransformer(),
      new RefTransformer(),
      new DefaultTransformer(),
    ];
  }

  transform(sourceNode: SchemaNode, spec: FieldTypeSpec): TransformResult {
    const normalizedSpec = this.normalizeSpec(spec);
    const ctx: TransformContext = {
      sourceNode,
      targetSpec: normalizedSpec,
      refSchemas: this._refSchemas,
    };

    const transformer = this._transformers.find((t) => t.canTransform(ctx));
    if (!transformer) {
      throw new Error(`No transformer found for spec: ${JSON.stringify(spec)}`);
    }

    return transformer.transform(ctx);
  }

  private normalizeSpec(spec: FieldTypeSpec): FieldSchemaSpec {
    if (typeof spec === 'string') {
      return { type: spec as SimpleFieldType };
    }
    return spec;
  }
}

export function createTypeTransformChain(options?: TypeTransformChainOptions): TypeTransformChain {
  return new TypeTransformChain(options);
}
