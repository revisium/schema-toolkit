import { nanoid } from 'nanoid';
import { createRefNode } from '../../../core/schema-node/index.js';
import { obj, ref } from '../../../mocks/schema.mocks.js';
import type { TypeTransformer, TransformContext, TransformResult } from '../types.js';
import { SchemaParser } from '../../schema-model/SchemaParser.js';

export class RefTransformer implements TypeTransformer {
  canTransform(ctx: TransformContext): boolean {
    return ctx.targetSpec.$ref !== undefined;
  }

  transform(ctx: TransformContext): TransformResult {
    const { sourceNode, targetSpec, refSchemas } = ctx;
    const refUri = targetSpec.$ref!;

    const resolvedSchema = refSchemas?.[refUri];
    if (resolvedSchema) {
      const parser = new SchemaParser();
      const wrapperSchema = obj({ temp: ref(refUri) });
      const resolvedNode = parser.parse(wrapperSchema, refSchemas);
      const tempNode = resolvedNode.property('temp');
      const newNode = tempNode.cloneWithId(nanoid());
      newNode.setName(sourceNode.name());
      return { node: newNode };
    }

    const metadata = this.extractMetadata(targetSpec);
    const node = createRefNode(nanoid(), sourceNode.name(), refUri, metadata);
    return { node };
  }

  private extractMetadata(spec: TransformContext['targetSpec']): { title?: string; description?: string; deprecated?: boolean } | undefined {
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
