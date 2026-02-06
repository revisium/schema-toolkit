import { nanoid } from 'nanoid';
import { createArrayNode } from '../../../core/schema-node/index.js';
import type { TypeTransformer, TransformContext, TransformResult } from '../types.js';

export class PrimitiveToArrayTransformer implements TypeTransformer {
  canTransform(ctx: TransformContext): boolean {
    const { sourceNode, targetSpec } = ctx;
    return sourceNode.isPrimitive() && targetSpec.type === 'array';
  }

  transform(ctx: TransformContext): TransformResult {
    const { sourceNode } = ctx;
    const itemsNode = sourceNode.cloneWithId(nanoid());
    itemsNode.setName('items');
    const arrayNode = createArrayNode(sourceNode.id(), sourceNode.name(), itemsNode);
    return { node: arrayNode };
  }
}
