import { describe, it, expect } from '@jest/globals';
import { autorun } from 'mobx';
import { createSchemaModel } from '../SchemaModelImpl.js';
import { emptySchema, simpleSchema, findNodeIdByName, schemaWithFormula } from './test-helpers.js';

describe('SchemaModel computed properties', () => {
  describe('with reactivity (MobX)', () => {
    it('caches validationErrors result', () => {
      const model = createSchemaModel(simpleSchema());

      let errors1: unknown, errors2: unknown;
      autorun(() => {
        errors1 = model.validationErrors;
        errors2 = model.validationErrors;
      });

      expect(errors1).toBe(errors2);
    });

    it('invalidates cache when tree changes', () => {
      const model = createSchemaModel(simpleSchema());
      const nameId = findNodeIdByName(model, 'name');

      const errors1 = model.validationErrors;
      expect(errors1).toHaveLength(0);

      model.renameField(nameId!, '');

      const errors2 = model.validationErrors;
      expect(errors2).toHaveLength(1);
      expect(errors1).not.toBe(errors2);
    });

    it('caches formulaErrors result', () => {
      const model = createSchemaModel(schemaWithFormula());

      let errors1: unknown, errors2: unknown;
      autorun(() => {
        errors1 = model.formulaErrors;
        errors2 = model.formulaErrors;
      });

      expect(errors1).toBe(errors2);
    });


    it('caches isValid result', () => {
      const model = createSchemaModel(simpleSchema());

      expect(model.isValid).toBe(true);
      expect(model.isValid).toBe(true);
    });

    it('invalidates isValid cache when schema becomes invalid', () => {
      const model = createSchemaModel(simpleSchema());
      const nameId = findNodeIdByName(model, 'name');

      expect(model.isValid).toBe(true);

      model.renameField(nameId!, '');

      expect(model.isValid).toBe(false);
    });

    it('caches nodeCount result', () => {
      const model = createSchemaModel(simpleSchema());

      expect(model.nodeCount).toBe(3);
      expect(model.nodeCount).toBe(3);
    });

    it('updates nodeCount when field added', () => {
      const model = createSchemaModel(simpleSchema());

      expect(model.nodeCount).toBe(3);

      model.addField(model.root.id(), 'email', 'string');

      expect(model.nodeCount).toBe(4);
    });

    it('updates nodeCount when field removed', () => {
      const model = createSchemaModel(simpleSchema());
      const nameId = findNodeIdByName(model, 'name');

      expect(model.nodeCount).toBe(3);

      model.removeField(nameId!);

      expect(model.nodeCount).toBe(2);
    });

    it('nodeCount returns correct value for empty schema', () => {
      const model = createSchemaModel(emptySchema());

      expect(model.nodeCount).toBe(1);
    });
  });

  describe('node reactivity with MobX', () => {
    it('triggers reaction when node name changes', () => {
      const model = createSchemaModel(simpleSchema());
      const nameId = findNodeIdByName(model, 'name');
      const node = model.nodeById(nameId!);

      let observedName = '';
      autorun(() => {
        observedName = node.name();
      });

      expect(observedName).toBe('name');

      model.renameField(nameId!, 'newName');

      expect(observedName).toBe('newName');
    });

    it('triggers reaction when node metadata changes', () => {
      const model = createSchemaModel(simpleSchema());
      const nameId = findNodeIdByName(model, 'name');
      const node = model.nodeById(nameId!);

      let observedMeta: unknown = null;
      autorun(() => {
        observedMeta = node.metadata();
      });

      expect(observedMeta).toEqual({});

      model.updateMetadata(nameId!, { title: 'Name Field', description: 'Enter your name' });

      expect(observedMeta).toEqual({ title: 'Name Field', description: 'Enter your name' });
    });

    it('triggers reaction when adding child to object node', () => {
      const model = createSchemaModel(emptySchema());
      const rootId = model.root.id();

      let childCount = 0;
      autorun(() => {
        childCount = model.root.properties().length;
      });

      expect(childCount).toBe(0);

      model.addField(rootId, 'email', 'string');

      expect(childCount).toBe(1);
    });

    it('triggers reaction when default value changes', () => {
      const model = createSchemaModel(simpleSchema());
      const ageId = findNodeIdByName(model, 'age');
      const node = model.nodeById(ageId!);

      let observedDefault: unknown = null;
      autorun(() => {
        observedDefault = node.defaultValue();
      });

      expect(observedDefault).toBe(0);

      model.updateDefaultValue(ageId!, 25);

      expect(observedDefault).toBe(25);
    });
  });
});
