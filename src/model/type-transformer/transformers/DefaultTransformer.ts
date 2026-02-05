import { nanoid } from 'nanoid';
import {
  createObjectNode,
  createArrayNode,
  createStringNode,
  createNumberNode,
  createBooleanNode,
} from '../../../core/schema-node/index.js';
import type { SchemaNode, NodeMetadata } from '../../../core/schema-node/index.js';
import type { TypeTransformer, TransformContext, TransformResult, SimpleFieldType } from '../types.js';

export class DefaultTransformer implements TypeTransformer {
  canTransform(ctx: TransformContext): boolean {
    return ctx.targetSpec.type !== undefined;
  }

  transform(ctx: TransformContext): TransformResult {
    const { sourceNode, targetSpec } = ctx;
    const type = targetSpec.type!;
    const metadata = this.extractMetadata(targetSpec);
    const node = this.createNode(sourceNode.name(), type, targetSpec, metadata);
    return { node };
  }

  private createNode(
    name: string,
    type: SimpleFieldType,
    spec: TransformContext['targetSpec'],
    metadata?: NodeMetadata,
  ): SchemaNode {
    switch (type) {
      case 'string':
        return createStringNode(nanoid(), name, {
          defaultValue: spec.default as string ?? '',
          foreignKey: spec.foreignKey,
          metadata,
        });
      case 'number':
        return createNumberNode(nanoid(), name, {
          defaultValue: spec.default as number ?? 0,
          metadata,
        });
      case 'boolean':
        return createBooleanNode(nanoid(), name, {
          defaultValue: spec.default as boolean ?? false,
          metadata,
        });
      case 'object':
        return createObjectNode(nanoid(), name, [], { metadata });
      case 'array':
        return this.createArrayNode(name, metadata);
      default:
        throw new Error(`Unknown field type: ${type}`);
    }
  }

  private createArrayNode(name: string, metadata?: NodeMetadata): SchemaNode {
    const items = createStringNode(nanoid(), 'items', { defaultValue: '' });
    return createArrayNode(nanoid(), name, items, { metadata });
  }

  private extractMetadata(spec: TransformContext['targetSpec']): NodeMetadata | undefined {
    const meta: { title?: string; description?: string; deprecated?: boolean } = {};
    let hasValue = false;

    if (spec.title) {
      meta.title = spec.title;
      hasValue = true;
    }
    if (spec.description) {
      meta.description = spec.description;
      hasValue = true;
    }
    if (spec.deprecated) {
      meta.deprecated = spec.deprecated;
      hasValue = true;
    }

    return hasValue ? meta : undefined;
  }
}
