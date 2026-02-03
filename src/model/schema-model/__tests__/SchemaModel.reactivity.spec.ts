import { describe, it, expect } from '@jest/globals';
import { autorun } from 'mobx';
import { createSchemaModel } from '../SchemaModelImpl.js';
import { simpleSchema, emptySchema, findNodeIdByName } from './test-helpers.js';

describe('SchemaModel reactivity', () => {
  describe('initialization with reactivity', () => {
    it('model has observable properties', () => {
      const model = createSchemaModel(emptySchema());

      let observedIsDirty = false;
      const dispose = autorun(() => {
        observedIsDirty = model.isDirty;
      });

      expect(observedIsDirty).toBe(false);

      model.addField(model.root.id(), 'field', 'string');

      expect(observedIsDirty).toBe(true);

      dispose();
    });

    it('root is computed and reactive', () => {
      const model = createSchemaModel(emptySchema());

      let observedRoot = model.root;
      const dispose = autorun(() => {
        observedRoot = model.root;
      });

      expect(observedRoot.properties()).toHaveLength(0);

      model.addField(model.root.id(), 'field', 'string');

      expect(observedRoot.properties()).toHaveLength(1);

      dispose();
    });
  });

  describe('operations with reactivity', () => {
    it('addField works with reactive model', () => {
      const model = createSchemaModel(emptySchema());
      const rootId = model.root.id();

      model.addField(rootId, 'field', 'string');

      expect(model.root.properties()).toHaveLength(1);
    });

    it('removeField works with reactive model', () => {
      const model = createSchemaModel(simpleSchema());
      const nameId = findNodeIdByName(model, 'name');

      model.removeField(nameId!);

      expect(model.root.properties()).toHaveLength(1);
    });

    it('markAsSaved works with reactive model', () => {
      const model = createSchemaModel(emptySchema());
      const rootId = model.root.id();

      model.addField(rootId, 'field', 'string');
      model.markAsSaved();

      expect(model.isDirty).toBe(false);
    });

    it('revert works with reactive model', () => {
      const model = createSchemaModel(emptySchema());
      const rootId = model.root.id();

      model.addField(rootId, 'field', 'string');
      model.revert();

      expect(model.root.properties()).toHaveLength(0);
    });
  });

  describe('changeFieldType on root', () => {
    it('returns same node when trying to change root type', () => {
      const model = createSchemaModel(simpleSchema());
      const rootId = model.root.id();

      const result = model.changeFieldType(rootId, 'array');

      expect(result.id()).toBe(rootId);
      expect(model.root.isObject()).toBe(true);
    });
  });
});
