import { describe, it, expect } from '@jest/globals';
import { createSchemaModel } from '../SchemaModelImpl.js';
import {
  simpleSchema,
  nestedSchema,
  arraySchema,
  findNodeIdByName,
  findNestedNodeId,
} from './test-helpers.js';
import { obj, str, num, arr } from '../../../mocks/schema.mocks.js';

describe('SchemaModel drag-drop operations', () => {
  describe('canMoveNode', () => {
    it('returns true for valid move to different object', () => {
      const schema = obj({
        field: str(),
        target: obj({}),
      });
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
      const schema = obj({
        outer: obj({
          inner: obj({}),
        }),
      });
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
      const schema = obj({
        branch1: obj({
          field: str(),
        }),
        branch2: obj({}),
      });
      const model = createSchemaModel(schema);
      const fieldId = findNestedNodeId(model, 'branch1', 'field');
      const branch2Id = findNodeIdByName(model, 'branch2');

      expect(model.canMoveNode(fieldId!, branch2Id!)).toBe(true);
    });

    describe('moving out of array items', () => {
      it('returns false when moving field from array items to object outside array', () => {
        const schema = obj({
          items: arr(
            obj({
              name: str(),
              value: num(),
            }),
          ),
          target: obj({}),
        });
        const model = createSchemaModel(schema);
        const itemsArray = findNodeIdByName(model, 'items');
        const itemsNode = model.nodeById(itemsArray!);
        const itemsObjectNode = itemsNode.items();
        const nameField = itemsObjectNode.property('name');
        const targetId = findNodeIdByName(model, 'target');

        expect(model.canMoveNode(nameField.id(), targetId!)).toBe(false);
      });

      it('returns false when moving field from array items to root', () => {
        const schema = obj({
          items: arr(
            obj({
              field: str(),
            }),
          ),
        });
        const model = createSchemaModel(schema);
        const itemsArray = findNodeIdByName(model, 'items');
        const itemsNode = model.nodeById(itemsArray!);
        const itemsObjectNode = itemsNode.items();
        const fieldNode = itemsObjectNode.property('field');
        const rootId = model.root.id();

        expect(model.canMoveNode(fieldNode.id(), rootId)).toBe(false);
      });

      it('returns true when moving field within same array items', () => {
        const schema = obj({
          items: arr(
            obj({
              nested: obj({
                field: str(),
              }),
            }),
          ),
        });
        const model = createSchemaModel(schema);
        const itemsArray = findNodeIdByName(model, 'items');
        const itemsNode = model.nodeById(itemsArray!);
        const itemsObjectNode = itemsNode.items();
        const nestedNode = itemsObjectNode.property('nested');
        const fieldNode = nestedNode.property('field');

        expect(model.canMoveNode(fieldNode.id(), itemsObjectNode.id())).toBe(true);
      });

      it('returns false when moving field from nested array to outer object', () => {
        const schema = obj({
          outer: obj({
            items: arr(
              obj({
                field: str(),
              }),
            ),
          }),
          target: obj({}),
        });
        const model = createSchemaModel(schema);
        const outerNode = findNodeIdByName(model, 'outer');
        const itemsArray = model.nodeById(outerNode!).property('items');
        const itemsObjectNode = itemsArray.items();
        const fieldNode = itemsObjectNode.property('field');
        const targetId = findNodeIdByName(model, 'target');

        expect(model.canMoveNode(fieldNode.id(), targetId!)).toBe(false);
      });

      it('returns false when moving field between different arrays', () => {
        const schema = obj({
          array1: arr(
            obj({
              field1: str(),
            }),
          ),
          array2: arr(obj({})),
        });
        const model = createSchemaModel(schema);
        const array1Node = findNodeIdByName(model, 'array1');
        const array2Node = findNodeIdByName(model, 'array2');
        const items1ObjectNode = model.nodeById(array1Node!).items();
        const items2ObjectNode = model.nodeById(array2Node!).items();
        const field1Node = items1ObjectNode.property('field1');

        expect(model.canMoveNode(field1Node.id(), items2ObjectNode.id())).toBe(false);
      });
    });
  });

  describe('moveNode', () => {
    it('moves node to target object', () => {
      const schema = obj({
        field: str(),
        target: obj({}),
      });
      const model = createSchemaModel(schema);
      const fieldId = findNodeIdByName(model, 'field');
      const targetId = findNodeIdByName(model, 'target');

      model.moveNode(fieldId!, targetId!);

      const target = model.nodeById(targetId!);
      expect(target.property('field').isNull()).toBe(false);
      expect(model.root.property('field').isNull()).toBe(true);
    });

    it('does nothing if canMoveNode returns false', () => {
      const model = createSchemaModel(simpleSchema());
      const nameId = findNodeIdByName(model, 'name');
      const ageId = findNodeIdByName(model, 'age');

      model.moveNode(nameId!, ageId!);

      expect(model.root.property('name').isNull()).toBe(false);
    });

    it('updates paths after move - canMoveNode returns false for current parent', () => {
      const schema = obj({
        field: str(),
        target: obj({}),
      });
      const model = createSchemaModel(schema);
      const fieldId = findNodeIdByName(model, 'field');
      const targetId = findNodeIdByName(model, 'target');

      expect(model.canMoveNode(fieldId!, targetId!)).toBe(true);

      model.moveNode(fieldId!, targetId!);

      expect(model.canMoveNode(fieldId!, targetId!)).toBe(false);
    });

    it('hasValidDropTarget updates correctly after move', () => {
      const schema = obj({
        field: str(),
        target: obj({}),
      });
      const model = createSchemaModel(schema);
      const fieldId = findNodeIdByName(model, 'field');
      const targetId = findNodeIdByName(model, 'target');

      expect(model.hasValidDropTarget(fieldId!)).toBe(true);

      model.moveNode(fieldId!, targetId!);

      expect(model.hasValidDropTarget(fieldId!)).toBe(true);
      expect(model.canMoveNode(fieldId!, targetId!)).toBe(false);
      expect(model.canMoveNode(fieldId!, model.root.id())).toBe(true);
    });

    it('canMoveNode returns true for root after moving from nested', () => {
      const model = createSchemaModel(nestedSchema());
      const userId = findNodeIdByName(model, 'user');
      const firstNameId = findNestedNodeId(model, 'user', 'firstName');
      const rootId = model.root.id();

      expect(model.canMoveNode(firstNameId!, rootId)).toBe(true);

      model.moveNode(firstNameId!, rootId);

      expect(model.canMoveNode(firstNameId!, userId!)).toBe(true);
    });

    it('marks model as dirty after move', () => {
      const schema = obj({
        field: str(),
        target: obj({}),
      });
      const model = createSchemaModel(schema);
      const fieldId = findNodeIdByName(model, 'field');
      const targetId = findNodeIdByName(model, 'target');

      expect(model.isDirty).toBe(false);

      model.moveNode(fieldId!, targetId!);

      expect(model.isDirty).toBe(true);
    });
  });

  describe('hasValidDropTarget', () => {
    it('returns true when valid target exists', () => {
      const schema = obj({
        field: str(),
        target: obj({}),
      });
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
      const schema = obj({
        obj1: obj({
          field: str(),
        }),
        obj2: obj({}),
      });
      const model = createSchemaModel(schema);
      const fieldId = findNestedNodeId(model, 'obj1', 'field');

      expect(model.hasValidDropTarget(fieldId!)).toBe(true);
    });
  });
});
