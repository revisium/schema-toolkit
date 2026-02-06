import { describe, it, expect } from '@jest/globals';
import { createSchemaModel } from '../SchemaModelImpl.js';
import { obj, str } from '../../../mocks/schema.mocks.js';
import {
  emptySchema,
  simpleSchema,
  schemaWithFormula,
  findNodeIdByName,
} from './test-helpers.js';

describe('SchemaModel patches', () => {
  describe('getPatches', () => {
    it('returns empty array when no changes', () => {
      const model = createSchemaModel(simpleSchema());

      expect(model.patches).toMatchSnapshot();
    });

    it('returns add patch for new field', () => {
      const model = createSchemaModel(emptySchema());
      const rootId = model.root.id();

      model.addField(rootId, 'newField', 'string');

      expect(model.patches).toMatchSnapshot();
    });

    it('returns remove patch for deleted field', () => {
      const model = createSchemaModel(simpleSchema());
      const nameId = findNodeIdByName(model, 'name');

      model.removeField(nameId!);

      expect(model.patches).toMatchSnapshot();
    });

    it('returns move patch for renamed field', () => {
      const model = createSchemaModel(simpleSchema());
      const nameId = findNodeIdByName(model, 'name');

      model.renameField(nameId!, 'fullName');

      expect(model.patches).toMatchSnapshot();
    });

    it('returns replace patch for type change', () => {
      const model = createSchemaModel(simpleSchema());
      const nameId = findNodeIdByName(model, 'name');

      model.changeFieldType(nameId!, 'number');

      expect(model.patches).toMatchSnapshot();
    });

    it('returns replace patch for primitive to object type change', () => {
      const model = createSchemaModel(simpleSchema());
      const nameId = findNodeIdByName(model, 'name');

      model.changeFieldType(nameId!, 'object');

      const patches = model.patches;
      expect(patches).toHaveLength(1);
      expect(patches[0]?.patch.op).toBe('replace');
      expect(patches[0]?.typeChange).toMatchObject({
        fromType: 'string',
        toType: 'object',
      });
    });

    it('returns replace patch for primitive to array type change', () => {
      const model = createSchemaModel(simpleSchema());
      const nameId = findNodeIdByName(model, 'name');

      model.changeFieldType(nameId!, 'array');

      const patches = model.patches;
      expect(patches).toHaveLength(1);
      expect(patches[0]?.patch.op).toBe('replace');
      expect(patches[0]?.typeChange).toMatchObject({
        fromType: 'string',
        toType: 'array<string>',
      });
    });

    it('handles type change on newly created field (not yet saved)', () => {
      const model = createSchemaModel(emptySchema());
      const rootId = model.root.id();

      const newField = model.addField(rootId, 'newField', 'string');
      model.changeFieldType(newField.id(), 'object');

      expect(model.patches).toMatchSnapshot();
    });

    it('handles type change on newly created field to array (not yet saved)', () => {
      const model = createSchemaModel(emptySchema());
      const rootId = model.root.id();

      const newField = model.addField(rootId, 'newField', 'string');
      model.changeFieldType(newField.id(), 'array');

      expect(model.patches).toMatchSnapshot();
    });

    it('returns replace patch for default value change', () => {
      const model = createSchemaModel(simpleSchema());
      const nameId = findNodeIdByName(model, 'name');

      model.updateDefaultValue(nameId!, 'changed');

      expect(model.patches).toMatchSnapshot();
    });

    it('includes formula change info', () => {
      const model = createSchemaModel(simpleSchema());
      const ageId = findNodeIdByName(model, 'age');

      model.updateFormula(ageId!, 'name');

      expect(model.patches).toMatchSnapshot();
    });

    it('multiple field additions', () => {
      const model = createSchemaModel(emptySchema());
      const rootId = model.root.id();

      model.addField(rootId, 'field1', 'string');
      model.addField(rootId, 'field2', 'number');
      model.addField(rootId, 'field3', 'boolean');

      expect(model.patches).toMatchSnapshot();
    });

    it('auto-updates formula serialization when dependency is renamed', () => {
      const model = createSchemaModel(schemaWithFormula());
      const priceId = findNodeIdByName(model, 'price');
      const totalId = findNodeIdByName(model, 'total');

      model.renameField(priceId!, 'cost');

      const patches = model.patches;
      expect(patches).toHaveLength(2);

      const movePatches = patches.filter((p) => p.patch.op === 'move');
      expect(movePatches).toHaveLength(1);
      expect(movePatches[0]?.patch).toMatchObject({
        op: 'move',
        from: '/properties/price',
        path: '/properties/cost',
      });

      const replacePatches = patches.filter((p) => p.patch.op === 'replace');
      expect(replacePatches).toHaveLength(1);
      const formulaPatch = replacePatches[0];
      expect(formulaPatch?.fieldName).toBe('total');
      const formulaChange = formulaPatch?.propertyChanges.find((c) => c.property === 'formula');
      expect(formulaChange).toMatchObject({
        from: 'price * quantity',
        to: 'cost * quantity',
      });

      const totalNode = model.nodeById(totalId!);
      const formula = totalNode.formula();
      expect(formula).toBeDefined();
      expect(formula?.expression()).toBe('price * quantity');
    });
  });

  describe('getJsonPatches', () => {
    it('returns plain JSON patches', () => {
      const model = createSchemaModel(emptySchema());
      const rootId = model.root.id();

      model.addField(rootId, 'field', 'string');

      expect(model.jsonPatches).toMatchSnapshot();
    });
  });

  describe('isDirty', () => {
    it('returns false initially', () => {
      const model = createSchemaModel(simpleSchema());

      expect(model.isDirty).toBe(false);
    });

    it('returns true after adding field', () => {
      const model = createSchemaModel(emptySchema());
      const rootId = model.root.id();

      model.addField(rootId, 'field', 'string');

      expect(model.isDirty).toBe(true);
    });

    it('returns false after markAsSaved', () => {
      const model = createSchemaModel(emptySchema());
      const rootId = model.root.id();

      model.addField(rootId, 'field', 'string');
      model.markAsSaved();

      expect(model.isDirty).toBe(false);
    });

    it('returns false after revert', () => {
      const model = createSchemaModel(emptySchema());
      const rootId = model.root.id();

      model.addField(rootId, 'field', 'string');
      model.revert();

      expect(model.isDirty).toBe(false);
    });
  });

  describe('patches with refSchemas', () => {
    const fileSchema = obj({
      fileId: str(),
      url: str(),
    });

    it('adding and removing regular field works with refSchemas option', () => {
      const schema = obj({
        name: str(),
      });

      const model = createSchemaModel(schema, {
        refSchemas: { File: fileSchema },
      });

      const avatar = model.addField(model.root.id(), 'avatar', 'object');
      const avatarNode = model.nodeById(avatar.id());
      expect(avatarNode.isObject()).toBe(true);

      model.removeField(avatar.id());

      expect(model.patches).toMatchSnapshot();
    });

    it('removing ref field generates patch with $ref value', () => {
      const schema = obj({
        name: str(),
        avatar: { $ref: 'File' } as { $ref: string },
      });

      const model = createSchemaModel(schema, {
        refSchemas: { File: fileSchema },
      });

      const avatarId = findNodeIdByName(model, 'avatar');
      model.removeField(avatarId!);

      const patches = model.patches;
      expect(patches).toHaveLength(1);
      expect(patches[0]?.patch.op).toBe('remove');
      expect(patches[0]?.patch.path).toBe('/properties/avatar');
    });

    it('renaming ref field generates move patch', () => {
      const schema = obj({
        avatar: { $ref: 'File' } as { $ref: string },
      });

      const model = createSchemaModel(schema, {
        refSchemas: { File: fileSchema },
      });

      const avatarId = findNodeIdByName(model, 'avatar');
      model.renameField(avatarId!, 'image');

      const patches = model.patches;
      expect(patches).toHaveLength(1);
      expect(patches[0]?.patch.op).toBe('move');
      expect(patches[0]?.patch.path).toBe('/properties/image');
    });
  });
});
