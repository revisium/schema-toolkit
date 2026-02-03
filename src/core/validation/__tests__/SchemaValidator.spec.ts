import { describe, it, expect } from '@jest/globals';
import { validateSchema } from '../schema/SchemaValidator.js';
import {
  createObjectNode,
  createArrayNode,
  createStringNode,
} from '../../schema-node/index.js';

describe('SchemaValidator', () => {
  describe('validateSchema', () => {
    it('returns empty array for valid schema', () => {
      const root = createObjectNode('root-id', 'root', [
        createStringNode('name-id', 'name'),
        createStringNode('age-id', 'age'),
      ]);

      const errors = validateSchema(root);

      expect(errors).toHaveLength(0);
    });

    it('detects empty field name', () => {
      const root = createObjectNode('root-id', 'root', [
        createStringNode('empty-id', ''),
      ]);

      const errors = validateSchema(root);

      expect(errors).toHaveLength(1);
      expect(errors[0]).toMatchObject({
        nodeId: 'empty-id',
        type: 'empty-name',
        message: 'Field name cannot be empty',
      });
    });

    it('detects duplicate field names', () => {
      const root = createObjectNode('root-id', 'root', [
        createStringNode('first-id', 'name'),
        createStringNode('second-id', 'name'),
      ]);

      const errors = validateSchema(root);

      expect(errors).toHaveLength(1);
      expect(errors[0]).toMatchObject({
        nodeId: 'second-id',
        type: 'duplicate-name',
        message: 'Duplicate field name: name',
      });
    });

    it('detects invalid field name pattern', () => {
      const root = createObjectNode('root-id', 'root', [
        createStringNode('invalid-id', '123invalid'),
      ]);

      const errors = validateSchema(root);

      expect(errors).toHaveLength(1);
      expect(errors[0]).toMatchObject({
        nodeId: 'invalid-id',
        type: 'invalid-name',
      });
    });

    it('detects name starting with double underscore', () => {
      const root = createObjectNode('root-id', 'root', [
        createStringNode('reserved-id', '__reserved'),
      ]);

      const errors = validateSchema(root);

      expect(errors).toHaveLength(1);
      expect(errors[0]).toMatchObject({
        nodeId: 'reserved-id',
        type: 'invalid-name',
      });
    });

    it('validates nested object fields', () => {
      const root = createObjectNode('root-id', 'root', [
        createObjectNode('nested-id', 'nested', [
          createStringNode('empty-id', ''),
        ]),
      ]);

      const errors = validateSchema(root);

      expect(errors).toHaveLength(1);
      expect(errors[0]?.nodeId).toBe('empty-id');
    });

    it('validates array items schema', () => {
      const items = createObjectNode('items-id', 'items', [
        createStringNode('invalid-id', '1invalid'),
      ]);
      const root = createObjectNode('root-id', 'root', [
        createArrayNode('array-id', 'items', items),
      ]);

      const errors = validateSchema(root);

      expect(errors).toHaveLength(1);
      expect(errors[0]?.nodeId).toBe('invalid-id');
    });

    it('collects multiple errors', () => {
      const root = createObjectNode('root-id', 'root', [
        createStringNode('empty-id', ''),
        createStringNode('invalid-id', '123'),
        createStringNode('reserved-id', '__sys'),
      ]);

      const errors = validateSchema(root);

      expect(errors).toHaveLength(3);
    });

    it('handles deeply nested structures', () => {
      const deepNested = createObjectNode('deep-id', 'deep', [
        createStringNode('invalid-id', ''),
      ]);
      const items = createArrayNode('items-id', 'items', deepNested);
      const middle = createObjectNode('middle-id', 'middle', [items]);
      const root = createObjectNode('root-id', 'root', [middle]);

      const errors = validateSchema(root);

      expect(errors).toHaveLength(1);
      expect(errors[0]?.nodeId).toBe('invalid-id');
    });

    it('does not report error on primitive array items', () => {
      const items = createStringNode('items-id', '');
      const root = createObjectNode('root-id', 'root', [
        createArrayNode('array-id', 'tags', items),
      ]);

      const errors = validateSchema(root);

      expect(errors).toHaveLength(0);
    });
  });
});
