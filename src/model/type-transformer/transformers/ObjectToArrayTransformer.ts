import { nanoid } from 'nanoid';
import { createArrayNode } from '../../../core/schema-node/index.js';
import type { TypeTransformer, TransformContext, TransformResult } from '../types.js';

export class ObjectToArrayTransformer implements TypeTransformer {
  canTransform(ctx: TransformContext): boolean {
    const { sourceNode, targetSpec } = ctx;
    return sourceNode.isObject() && targetSpec.type === 'array';
  }

  transform(ctx: TransformContext): TransformResult {
    const { sourceNode } = ctx;
    const itemsNode = sourceNode.cloneWithId(nanoid());
    itemsNode.setName('items');
    const arrayNode = createArrayNode(nanoid(), sourceNode.name(), itemsNode);
    return { node: arrayNode };
  }
}
