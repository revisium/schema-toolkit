import { describe, it, expect } from '@jest/globals';
import { createSchemaModel } from '../SchemaModelImpl.js';
import {
  emptySchema,
  simpleSchema,
  arraySchema,
  findNodeIdByName,
} from './test-helpers.js';
import { JsonSchemaTypeName, type JsonObjectSchema } from '../../../types/index.js';

describe('SchemaModel wrap operations', () => {
  describe('wrapInArray', () => {
    it('wraps primitive field in array', () => {
      const model = createSchemaModel(simpleSchema());
      const nameId = findNodeIdByName(model, 'name');

      const result = model.wrapInArray(nameId!);

      expect(result).not.toBeNull();
      expect(result!.replacedNodeId).toBe(nameId);

      const newNode = model.nodeById(result!.newNodeId);
      expect(newNode.isArray()).toBe(true);
      expect(newNode.name()).toBe('name');
      expect(newNode.items().isNull()).toBe(false);
    });

    it('wraps object field in array', () => {
      const schema: JsonObjectSchema = {
        type: JsonSchemaTypeName.Object,
        additionalProperties: false,
        required: ['user'],
        properties: {
          user: {
            type: JsonSchemaTypeName.Object,
            additionalProperties: false,
            required: ['name'],
            properties: {
              name: {
                type: JsonSchemaTypeName.String,
                default: '',
              },
            },
          },
        },
      };
      const model = createSchemaModel(schema);
      const userId = findNodeIdByName(model, 'user');

      const result = model.wrapInArray(userId!);

      expect(result).not.toBeNull();
      const arrayNode = model.nodeById(result!.newNodeId);
      expect(arrayNode.isArray()).toBe(true);
      expect(arrayNode.name()).toBe('user');
      expect(arrayNode.items().isObject()).toBe(true);
    });

    it('returns null when node does not exist', () => {
      const model = createSchemaModel(simpleSchema());

      const result = model.wrapInArray('non-existent-id');

      expect(result).toBeNull();
    });

    it('returns null when node is already an array', () => {
      const model = createSchemaModel(arraySchema());
      const itemsId = findNodeIdByName(model, 'items');

      const result = model.wrapInArray(itemsId!);

      expect(result).toBeNull();
    });

    it('returns null when trying to wrap root', () => {
      const model = createSchemaModel(simpleSchema());
      const rootId = model.root().id();

      const result = model.wrapInArray(rootId);

      expect(result).toBeNull();
    });

    it('preserves field order after wrapping', () => {
      const model = createSchemaModel(simpleSchema());
      const root = model.root();
      const originalOrder = root.properties().map((p) => p.name());
      const nameId = findNodeIdByName(model, 'name');

      model.wrapInArray(nameId!);

      const newOrder = model.root().properties().map((p) => p.name());
      expect(newOrder).toEqual(originalOrder);
    });

    it('generates correct patch', () => {
      const model = createSchemaModel(simpleSchema());
      const nameId = findNodeIdByName(model, 'name');

      model.wrapInArray(nameId!);

      expect(model.getPatches()).toMatchSnapshot();
    });

    it('marks model as dirty', () => {
      const model = createSchemaModel(simpleSchema());
      const nameId = findNodeIdByName(model, 'name');

      expect(model.isDirty()).toBe(false);
      model.wrapInArray(nameId!);
      expect(model.isDirty()).toBe(true);
    });
  });

  describe('wrapRootInArray', () => {
    it('wraps object root in array', () => {
      const model = createSchemaModel(simpleSchema());
      const oldRootId = model.root().id();

      const result = model.wrapRootInArray();

      expect(result).not.toBeNull();
      expect(result!.replacedNodeId).toBe(oldRootId);

      const newRoot = model.root();
      expect(newRoot.isArray()).toBe(true);
      expect(newRoot.items().isObject()).toBe(true);
    });

    it('returns null when root is already an array', () => {
      const model = createSchemaModel(emptySchema());
      model.replaceRoot('array');

      const result = model.wrapRootInArray();

      expect(result).toBeNull();
    });

    it('preserves root children as items children', () => {
      const model = createSchemaModel(simpleSchema());

      model.wrapRootInArray();

      const items = model.root().items();
      const nameNode = items.property('name');
      const ageNode = items.property('age');

      expect(nameNode.isNull()).toBe(false);
      expect(ageNode.isNull()).toBe(false);
    });

    it('generates correct patch', () => {
      const model = createSchemaModel(simpleSchema());

      model.wrapRootInArray();

      expect(model.getPatches()).toMatchSnapshot();
    });

    it('marks model as dirty', () => {
      const model = createSchemaModel(simpleSchema());

      expect(model.isDirty()).toBe(false);
      model.wrapRootInArray();
      expect(model.isDirty()).toBe(true);
    });
  });

  describe('replaceRoot', () => {
    it('replaces object root with array', () => {
      const model = createSchemaModel(simpleSchema());
      const oldRootId = model.root().id();

      const result = model.replaceRoot('array');

      expect(result).not.toBeNull();
      expect(result!.replacedNodeId).toBe(oldRootId);

      const newRoot = model.root();
      expect(newRoot.isArray()).toBe(true);
      expect(newRoot.id()).toBe(result!.newNodeId);
    });

    it('replaces object root with string', () => {
      const model = createSchemaModel(simpleSchema());

      const result = model.replaceRoot('string');

      expect(result).not.toBeNull();
      const newRoot = model.root();
      expect(newRoot.isPrimitive()).toBe(true);
    });

    it('preserves root name', () => {
      const model = createSchemaModel(simpleSchema());
      const originalName = model.root().name();

      model.replaceRoot('array');

      expect(model.root().name()).toBe(originalName);
    });

    it('generates correct patch', () => {
      const model = createSchemaModel(simpleSchema());

      model.replaceRoot('array');

      expect(model.getPatches()).toMatchSnapshot();
    });

    it('marks model as dirty', () => {
      const model = createSchemaModel(simpleSchema());

      expect(model.isDirty()).toBe(false);
      model.replaceRoot('array');
      expect(model.isDirty()).toBe(true);
    });

    it('replaces with number type', () => {
      const model = createSchemaModel(emptySchema());

      const result = model.replaceRoot('number');

      expect(result).not.toBeNull();
      const newRoot = model.root();
      expect(newRoot.isPrimitive()).toBe(true);
    });

    it('replaces with boolean type', () => {
      const model = createSchemaModel(emptySchema());

      const result = model.replaceRoot('boolean');

      expect(result).not.toBeNull();
      const newRoot = model.root();
      expect(newRoot.isPrimitive()).toBe(true);
    });
  });
});
