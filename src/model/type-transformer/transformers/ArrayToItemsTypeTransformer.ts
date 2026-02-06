import type { TypeTransformer, TransformContext, TransformResult, PrimitiveTypeName } from '../types.js';

export class ArrayToItemsTypeTransformer implements TypeTransformer {
  canTransform(ctx: TransformContext): boolean {
    const { sourceNode, targetSpec } = ctx;
    if (!sourceNode.isArray()) {
      return false;
    }
    const targetType = targetSpec.type;
    if (!targetType || !this.isPrimitiveType(targetType)) {
      return false;
    }
    const items = sourceNode.items();
    return items.nodeType() === targetType;
  }

  transform(ctx: TransformContext): TransformResult {
    const { sourceNode } = ctx;
    const items = sourceNode.items();
    const newNode = items.cloneWithId(sourceNode.id());
    newNode.setName(sourceNode.name());
    return { node: newNode };
  }

  private isPrimitiveType(type: string): type is PrimitiveTypeName {
    return type === 'string' || type === 'number' || type === 'boolean';
  }
}
