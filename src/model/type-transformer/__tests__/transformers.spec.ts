import { describe, it, expect } from '@jest/globals';
import { PrimitiveToArrayTransformer } from '../transformers/PrimitiveToArrayTransformer.js';
import { ObjectToArrayTransformer } from '../transformers/ObjectToArrayTransformer.js';
import { ArrayToItemsTypeTransformer } from '../transformers/ArrayToItemsTypeTransformer.js';
import { RefTransformer } from '../transformers/RefTransformer.js';
import { DefaultTransformer } from '../transformers/DefaultTransformer.js';
import type { TransformContext, PrimitiveTypeName } from '../types.js';
import { obj, str, num, arr, createModel, getFieldNode } from './test-helpers.js';

describe('PrimitiveToArrayTransformer', () => {
  const transformer = new PrimitiveToArrayTransformer();

  describe('canTransform', () => {
    it('returns true for primitive to array', () => {
      const model = createModel(obj({ field: str() }));
      const ctx: TransformContext = {
        sourceNode: getFieldNode(model, 'field'),
        targetSpec: { type: 'array' },
      };

      expect(transformer.canTransform(ctx)).toBe(true);
    });

    it('returns false for object to array', () => {
      const model = createModel(obj({ field: obj({}) }));
      const ctx: TransformContext = {
        sourceNode: getFieldNode(model, 'field'),
        targetSpec: { type: 'array' },
      };

      expect(transformer.canTransform(ctx)).toBe(false);
    });

    it('returns false for primitive to non-array', () => {
      const model = createModel(obj({ field: str() }));
      const ctx: TransformContext = {
        sourceNode: getFieldNode(model, 'field'),
        targetSpec: { type: 'number' },
      };

      expect(transformer.canTransform(ctx)).toBe(false);
    });
  });

  describe('transform', () => {
    it('preserves source type in items', () => {
      const model = createModel(obj({ scores: num({ default: 100 }) }));
      const ctx: TransformContext = {
        sourceNode: getFieldNode(model, 'scores'),
        targetSpec: { type: 'array' },
      };

      const result = transformer.transform(ctx);

      expect(result.node.items().nodeType()).toBe('number');
      expect(result.node.items().defaultValue()).toBe(100);
    });
  });
});

describe('ObjectToArrayTransformer', () => {
  const transformer = new ObjectToArrayTransformer();

  describe('canTransform', () => {
    it('returns true for object to array', () => {
      const model = createModel(obj({ field: obj({}) }));
      const ctx: TransformContext = {
        sourceNode: getFieldNode(model, 'field'),
        targetSpec: { type: 'array' },
      };

      expect(transformer.canTransform(ctx)).toBe(true);
    });

    it('returns false for primitive to array', () => {
      const model = createModel(obj({ field: str() }));
      const ctx: TransformContext = {
        sourceNode: getFieldNode(model, 'field'),
        targetSpec: { type: 'array' },
      };

      expect(transformer.canTransform(ctx)).toBe(false);
    });
  });

  describe('transform', () => {
    it('preserves object structure in items', () => {
      const model = createModel(obj({ item: obj({ name: str() }) }));
      const ctx: TransformContext = {
        sourceNode: getFieldNode(model, 'item'),
        targetSpec: { type: 'array' },
      };

      const result = transformer.transform(ctx);

      expect(result.node.items().nodeType()).toBe('object');
      expect(result.node.items().property('name').nodeType()).toBe('string');
    });
  });
});

describe('ArrayToItemsTypeTransformer', () => {
  const transformer = new ArrayToItemsTypeTransformer();

  describe('canTransform', () => {
    it('returns true when array items type matches target', () => {
      const model = createModel(obj({ tags: arr(str()) }));
      const ctx: TransformContext = {
        sourceNode: getFieldNode(model, 'tags'),
        targetSpec: { type: 'string' },
      };

      expect(transformer.canTransform(ctx)).toBe(true);
    });

    it('returns false when types do not match', () => {
      const model = createModel(obj({ tags: arr(str()) }));
      const ctx: TransformContext = {
        sourceNode: getFieldNode(model, 'tags'),
        targetSpec: { type: 'number' },
      };

      expect(transformer.canTransform(ctx)).toBe(false);
    });

    it('returns false for non-array source', () => {
      const model = createModel(obj({ field: str() }));
      const ctx: TransformContext = {
        sourceNode: getFieldNode(model, 'field'),
        targetSpec: { type: 'string' },
      };

      expect(transformer.canTransform(ctx)).toBe(false);
    });

    it('returns false for composite target types', () => {
      const model = createModel(obj({ tags: arr(str()) }));
      const ctx: TransformContext = {
        sourceNode: getFieldNode(model, 'tags'),
        targetSpec: { type: 'object' },
      };

      expect(transformer.canTransform(ctx)).toBe(false);
    });
  });

  describe('transform', () => {
    it('extracts items node with correct name', () => {
      const model = createModel(obj({ scores: arr(num()) }));
      const ctx: TransformContext = {
        sourceNode: getFieldNode(model, 'scores'),
        targetSpec: { type: 'number' },
      };

      const result = transformer.transform(ctx);

      expect(result.node.nodeType()).toBe('number');
      expect(result.node.name()).toBe('scores');
    });
  });
});

describe('RefTransformer', () => {
  const transformer = new RefTransformer();

  describe('canTransform', () => {
    it('returns true when $ref is present', () => {
      const model = createModel(obj({ field: str() }));
      const ctx: TransformContext = {
        sourceNode: getFieldNode(model, 'field'),
        targetSpec: { $ref: 'urn:test:schema' },
      };

      expect(transformer.canTransform(ctx)).toBe(true);
    });

    it('returns false when $ref is absent', () => {
      const model = createModel(obj({ field: str() }));
      const ctx: TransformContext = {
        sourceNode: getFieldNode(model, 'field'),
        targetSpec: { type: 'string' },
      };

      expect(transformer.canTransform(ctx)).toBe(false);
    });
  });

  describe('transform', () => {
    it('creates unresolved ref node when schema not found', () => {
      const model = createModel(obj({ avatar: str() }));
      const ctx: TransformContext = {
        sourceNode: getFieldNode(model, 'avatar'),
        targetSpec: { $ref: 'urn:unknown:schema' },
      };

      const result = transformer.transform(ctx);

      expect(result.node.nodeType()).toBe('ref');
      expect(result.node.ref()).toBe('urn:unknown:schema');
    });
  });
});

describe('DefaultTransformer', () => {
  const transformer = new DefaultTransformer();

  describe('canTransform', () => {
    it('returns true when type is present', () => {
      const model = createModel(obj({ field: str() }));
      const ctx: TransformContext = {
        sourceNode: getFieldNode(model, 'field'),
        targetSpec: { type: 'number' },
      };

      expect(transformer.canTransform(ctx)).toBe(true);
    });

    it('returns false when only $ref is present', () => {
      const model = createModel(obj({ field: str() }));
      const ctx: TransformContext = {
        sourceNode: getFieldNode(model, 'field'),
        targetSpec: { $ref: 'urn:test' },
      };

      expect(transformer.canTransform(ctx)).toBe(false);
    });
  });

  describe('transform', () => {
    it.each<[PrimitiveTypeName, string | number | boolean]>([
      ['string', ''],
      ['number', 0],
      ['boolean', false],
    ])('creates %s with default value %p', (type, expectedDefault) => {
      const model = createModel(obj({ field: num() }));
      const ctx: TransformContext = {
        sourceNode: getFieldNode(model, 'field'),
        targetSpec: { type },
      };

      const result = transformer.transform(ctx);

      expect(result.node.nodeType()).toBe(type);
      expect(result.node.defaultValue()).toBe(expectedDefault);
    });

    it('creates empty object', () => {
      const model = createModel(obj({ field: str() }));
      const ctx: TransformContext = {
        sourceNode: getFieldNode(model, 'field'),
        targetSpec: { type: 'object' },
      };

      const result = transformer.transform(ctx);

      expect(result.node.nodeType()).toBe('object');
      expect(result.node.properties()).toHaveLength(0);
    });

    it('creates array with string items by default', () => {
      const model = createModel(obj({ field: obj({}) }));
      const ctx: TransformContext = {
        sourceNode: getFieldNode(model, 'field'),
        targetSpec: { type: 'array' },
      };

      const result = transformer.transform(ctx);

      expect(result.node.nodeType()).toBe('array');
      expect(result.node.items().nodeType()).toBe('string');
    });

    it('throws error for unknown type', () => {
      const model = createModel(obj({ field: str() }));
      const ctx: TransformContext = {
        sourceNode: getFieldNode(model, 'field'),
        targetSpec: { type: 'unknown' as never },
      };

      expect(() => transformer.transform(ctx)).toThrow('Unknown field type: unknown');
    });
  });
});
