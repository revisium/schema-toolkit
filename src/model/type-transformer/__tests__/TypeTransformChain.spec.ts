import { describe, it, expect } from '@jest/globals';
import { TypeTransformChain, createTypeTransformChain } from '../TypeTransformChain.js';
import {
  obj,
  str,
  num,
  bool,
  arr,
  createModel,
  getFieldNode,
  customRefSchemas,
} from './test-helpers.js';

describe('TypeTransformChain', () => {
  describe('primitive to primitive', () => {
    it('transforms string to number', () => {
      const model = createModel(obj({ field: str({ default: 'hello' }) }));
      const source = getFieldNode(model, 'field');
      const chain = new TypeTransformChain();

      const result = chain.transform(source, 'number');

      expect(result.node.nodeType()).toBe('number');
      expect(result.node.name()).toBe('field');
      expect(result.node.defaultValue()).toBe(0);
    });

    it('transforms number to string', () => {
      const model = createModel(obj({ field: num({ default: 42 }) }));
      const source = getFieldNode(model, 'field');
      const chain = new TypeTransformChain();

      const result = chain.transform(source, 'string');

      expect(result.node.nodeType()).toBe('string');
      expect(result.node.name()).toBe('field');
      expect(result.node.defaultValue()).toBe('');
    });

    it('transforms boolean to string', () => {
      const model = createModel(obj({ field: bool({ default: true }) }));
      const source = getFieldNode(model, 'field');
      const chain = new TypeTransformChain();

      const result = chain.transform(source, 'string');

      expect(result.node.nodeType()).toBe('string');
      expect(result.node.name()).toBe('field');
    });
  });

  describe('primitive to array', () => {
    it('wraps string in array<string>', () => {
      const model = createModel(obj({ tags: str({ default: 'value' }) }));
      const source = getFieldNode(model, 'tags');
      const chain = new TypeTransformChain();

      const result = chain.transform(source, 'array');

      expect(result.node.nodeType()).toBe('array');
      expect(result.node.name()).toBe('tags');
      expect(result.node.items().nodeType()).toBe('string');
      expect(result.node.items().name()).toBe('items');
    });

    it('wraps number in array<number>', () => {
      const model = createModel(obj({ scores: num({ default: 100 }) }));
      const source = getFieldNode(model, 'scores');
      const chain = new TypeTransformChain();

      const result = chain.transform(source, 'array');

      expect(result.node.nodeType()).toBe('array');
      expect(result.node.name()).toBe('scores');
      expect(result.node.items().nodeType()).toBe('number');
    });

    it('wraps boolean in array<boolean>', () => {
      const model = createModel(obj({ flags: bool({ default: true }) }));
      const source = getFieldNode(model, 'flags');
      const chain = new TypeTransformChain();

      const result = chain.transform(source, 'array');

      expect(result.node.nodeType()).toBe('array');
      expect(result.node.items().nodeType()).toBe('boolean');
    });
  });

  describe('object to array', () => {
    it('wraps object in array<object>', () => {
      const model = createModel(
        obj({
          item: obj({ name: str() }),
        }),
      );
      const source = getFieldNode(model, 'item');
      const chain = new TypeTransformChain();

      const result = chain.transform(source, 'array');

      expect(result.node.nodeType()).toBe('array');
      expect(result.node.name()).toBe('item');
      expect(result.node.items().nodeType()).toBe('object');
      expect(result.node.items().properties()).toHaveLength(1);
      expect(result.node.items().property('name').nodeType()).toBe('string');
    });
  });

  describe('array to primitive (matching items type)', () => {
    it('extracts string from array<string>', () => {
      const model = createModel(obj({ tags: arr(str()) }));
      const source = getFieldNode(model, 'tags');
      const chain = new TypeTransformChain();

      const result = chain.transform(source, 'string');

      expect(result.node.nodeType()).toBe('string');
      expect(result.node.name()).toBe('tags');
    });

    it('extracts number from array<number>', () => {
      const model = createModel(obj({ scores: arr(num()) }));
      const source = getFieldNode(model, 'scores');
      const chain = new TypeTransformChain();

      const result = chain.transform(source, 'number');

      expect(result.node.nodeType()).toBe('number');
      expect(result.node.name()).toBe('scores');
    });

    it('does not extract mismatched type', () => {
      const model = createModel(obj({ tags: arr(str()) }));
      const source = getFieldNode(model, 'tags');
      const chain = new TypeTransformChain();

      const result = chain.transform(source, 'number');

      expect(result.node.nodeType()).toBe('number');
      expect(result.node.defaultValue()).toBe(0);
    });
  });

  describe('with spec object', () => {
    it('applies default value from spec', () => {
      const model = createModel(obj({ field: num() }));
      const source = getFieldNode(model, 'field');
      const chain = new TypeTransformChain();

      const result = chain.transform(source, { type: 'string', default: 'N/A' });

      expect(result.node.nodeType()).toBe('string');
      expect(result.node.defaultValue()).toBe('N/A');
    });

    it('applies metadata from spec', () => {
      const model = createModel(obj({ field: str() }));
      const source = getFieldNode(model, 'field');
      const chain = new TypeTransformChain();

      const result = chain.transform(source, {
        type: 'number',
        title: 'Price',
        description: 'Item price',
        deprecated: true,
      });

      expect(result.node.metadata().title).toBe('Price');
      expect(result.node.metadata().description).toBe('Item price');
      expect(result.node.metadata().deprecated).toBe(true);
    });

    it('applies foreignKey for string type', () => {
      const model = createModel(obj({ field: num() }));
      const source = getFieldNode(model, 'field');
      const chain = new TypeTransformChain();

      const result = chain.transform(source, {
        type: 'string',
        foreignKey: 'users.id',
      });

      expect(result.node.foreignKey()).toBe('users.id');
    });
  });

  describe('$ref transformation', () => {
    it('creates ref node without refSchemas', () => {
      const model = createModel(obj({ avatar: str() }));
      const source = getFieldNode(model, 'avatar');
      const chain = new TypeTransformChain();

      const result = chain.transform(source, {
        $ref: 'urn:jsonschema:io:revisium:file-schema:1.0.0',
      });

      expect(result.node.nodeType()).toBe('ref');
      expect(result.node.name()).toBe('avatar');
      expect(result.node.ref()).toBe('urn:jsonschema:io:revisium:file-schema:1.0.0');
    });

    it('creates ref node with metadata', () => {
      const model = createModel(obj({ avatar: str() }));
      const source = getFieldNode(model, 'avatar');
      const chain = new TypeTransformChain();

      const result = chain.transform(source, {
        $ref: 'urn:jsonschema:io:revisium:file-schema:1.0.0',
        title: 'Avatar',
        description: 'User profile picture',
        deprecated: true,
      });

      expect(result.node.metadata().title).toBe('Avatar');
      expect(result.node.metadata().description).toBe('User profile picture');
      expect(result.node.metadata().deprecated).toBe(true);
    });

    it('resolves ref with refSchemas', () => {
      const model = createModel(obj({ data: str() }));
      const source = getFieldNode(model, 'data');
      const chain = new TypeTransformChain({ refSchemas: customRefSchemas });

      const result = chain.transform(source, { $ref: 'urn:custom:schema' });

      expect(result.node.nodeType()).toBe('object');
      expect(result.node.name()).toBe('data');
      expect(result.node.isRef()).toBe(true);
      expect(result.node.properties()).toHaveLength(2);
      expect(result.node.property('id').nodeType()).toBe('string');
      expect(result.node.property('value').nodeType()).toBe('number');
    });
  });

  describe('node id preservation', () => {
    it('preserves source node id', () => {
      const model = createModel(obj({ field: str() }));
      const source = getFieldNode(model, 'field');
      const originalId = source.id();
      const chain = new TypeTransformChain();

      const result = chain.transform(source, 'number');

      expect(result.node.id()).toBe(originalId);
    });
  });

  describe('factory function', () => {
    it('creates chain with createTypeTransformChain', () => {
      const chain = createTypeTransformChain();
      const model = createModel(obj({ field: str() }));
      const source = getFieldNode(model, 'field');

      const result = chain.transform(source, 'number');

      expect(result.node.nodeType()).toBe('number');
    });

    it('creates chain with options', () => {
      const chain = createTypeTransformChain({ refSchemas: customRefSchemas });
      const model = createModel(obj({ data: str() }));
      const source = getFieldNode(model, 'data');

      const result = chain.transform(source, { $ref: 'urn:custom:schema' });

      expect(result.node.isRef()).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('throws error for invalid spec without type or $ref', () => {
      const model = createModel(obj({ field: str() }));
      const source = getFieldNode(model, 'field');
      const chain = new TypeTransformChain();

      expect(() => chain.transform(source, {} as never)).toThrow('No transformer found');
    });
  });
});
