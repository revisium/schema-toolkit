import { describe, it, expect } from '@jest/globals';
import { createSchemaModel } from '../SchemaModelImpl.js';
import {
  simpleSchema,
  nestedSchema,
  arraySchema,
  findNodeIdByName,
  findNestedNodeId,
} from './test-helpers.js';
import { JsonSchemaTypeName, type JsonObjectSchema } from '../../../types/index.js';

describe('SchemaModel drag-drop operations', () => {
  describe('canMoveNode', () => {
    it('returns true for valid move to different object', () => {
      const schema: JsonObjectSchema = {
        type: JsonSchemaTypeName.Object,
        additionalProperties: false,
        required: ['field', 'target'],
        properties: {
          field: { type: JsonSchemaTypeName.String, default: '' },
          target: {
            type: JsonSchemaTypeName.Object,
            additionalProperties: false,
            required: [],
            properties: {},
          },
        },
      };
      const model = createSchemaModel(schema);
      const fieldId = findNodeIdByName(model, 'field');
      const targetId = findNodeIdByName(model, 'target');

      expect(model.canMoveNode(fieldId!, targetId!)).toBe(true);
    });

    it('returns false when moving to self', () => {
      const model = createSchemaModel(simpleSchema());
      const nameId = findNodeIdByName(model, 'name');

      expect(model.canMoveNode(nameId!, nameId!)).toBe(false);
    });

    it('returns false when node does not exist', () => {
      const model = createSchemaModel(simpleSchema());
      const nameId = findNodeIdByName(model, 'name');

      expect(model.canMoveNode('non-existent', nameId!)).toBe(false);
    });

    it('returns false when target does not exist', () => {
      const model = createSchemaModel(simpleSchema());
      const nameId = findNodeIdByName(model, 'name');

      expect(model.canMoveNode(nameId!, 'non-existent')).toBe(false);
    });

    it('returns false when target is not object', () => {
      const model = createSchemaModel(simpleSchema());
      const nameId = findNodeIdByName(model, 'name');
      const ageId = findNodeIdByName(model, 'age');

      expect(model.canMoveNode(nameId!, ageId!)).toBe(false);
    });

    it('returns false when target is an array', () => {
      const model = createSchemaModel(arraySchema());
      const rootId = model.root.id();
      const itemsId = findNodeIdByName(model, 'items');
      model.addField(rootId, 'field', 'string');
      const fieldId = findNodeIdByName(model, 'field');

      expect(model.canMoveNode(fieldId!, itemsId!)).toBe(false);
    });

    it('returns false when moving to descendant', () => {
      const schema: JsonObjectSchema = {
        type: JsonSchemaTypeName.Object,
        additionalProperties: false,
        required: ['outer'],
        properties: {
          outer: {
            type: JsonSchemaTypeName.Object,
            additionalProperties: false,
            required: ['inner'],
            properties: {
              inner: {
                type: JsonSchemaTypeName.Object,
                additionalProperties: false,
                required: [],
                properties: {},
              },
            },
          },
        },
      };
      const model = createSchemaModel(schema);
      const outerId = findNodeIdByName(model, 'outer');
      const innerId = findNestedNodeId(model, 'outer', 'inner');

      expect(model.canMoveNode(outerId!, innerId!)).toBe(false);
    });

    it('returns false when trying to move root', () => {
      const model = createSchemaModel(nestedSchema());
      const rootId = model.root.id();
      const userId = findNodeIdByName(model, 'user');

      expect(model.canMoveNode(rootId, userId!)).toBe(false);
    });

    it('returns false when moving to direct parent', () => {
      const model = createSchemaModel(nestedSchema());
      const userId = findNodeIdByName(model, 'user');
      const firstNameId = findNestedNodeId(model, 'user', 'firstName');

      expect(model.canMoveNode(firstNameId!, userId!)).toBe(false);
    });

    it('returns true when moving to different branch', () => {
      const schema: JsonObjectSchema = {
        type: JsonSchemaTypeName.Object,
        additionalProperties: false,
        required: ['branch1', 'branch2'],
        properties: {
          branch1: {
            type: JsonSchemaTypeName.Object,
            additionalProperties: false,
            required: ['field'],
            properties: {
              field: { type: JsonSchemaTypeName.String, default: '' },
            },
          },
          branch2: {
            type: JsonSchemaTypeName.Object,
            additionalProperties: false,
            required: [],
            properties: {},
          },
        },
      };
      const model = createSchemaModel(schema);
      const fieldId = findNestedNodeId(model, 'branch1', 'field');
      const branch2Id = findNodeIdByName(model, 'branch2');

      expect(model.canMoveNode(fieldId!, branch2Id!)).toBe(true);
    });
  });

  describe('hasValidDropTarget', () => {
    it('returns true when valid target exists', () => {
      const schema: JsonObjectSchema = {
        type: JsonSchemaTypeName.Object,
        additionalProperties: false,
        required: ['field', 'target'],
        properties: {
          field: { type: JsonSchemaTypeName.String, default: '' },
          target: {
            type: JsonSchemaTypeName.Object,
            additionalProperties: false,
            required: [],
            properties: {},
          },
        },
      };
      const model = createSchemaModel(schema);
      const fieldId = findNodeIdByName(model, 'field');

      expect(model.hasValidDropTarget(fieldId!)).toBe(true);
    });

    it('returns false when no valid target exists (flat schema)', () => {
      const model = createSchemaModel(simpleSchema());
      const nameId = findNodeIdByName(model, 'name');

      expect(model.hasValidDropTarget(nameId!)).toBe(false);
    });

    it('returns false when node does not exist', () => {
      const model = createSchemaModel(simpleSchema());

      expect(model.hasValidDropTarget('non-existent')).toBe(false);
    });

    it('returns false for root node', () => {
      const model = createSchemaModel(simpleSchema());
      const rootId = model.root.id();

      expect(model.hasValidDropTarget(rootId)).toBe(false);
    });

    it('returns true when nested object has sibling object', () => {
      const schema: JsonObjectSchema = {
        type: JsonSchemaTypeName.Object,
        additionalProperties: false,
        required: ['obj1', 'obj2'],
        properties: {
          obj1: {
            type: JsonSchemaTypeName.Object,
            additionalProperties: false,
            required: ['field'],
            properties: {
              field: { type: JsonSchemaTypeName.String, default: '' },
            },
          },
          obj2: {
            type: JsonSchemaTypeName.Object,
            additionalProperties: false,
            required: [],
            properties: {},
          },
        },
      };
      const model = createSchemaModel(schema);
      const fieldId = findNestedNodeId(model, 'obj1', 'field');

      expect(model.hasValidDropTarget(fieldId!)).toBe(true);
    });
  });
});
