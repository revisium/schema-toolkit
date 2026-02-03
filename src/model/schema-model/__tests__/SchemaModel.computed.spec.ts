import { describe, it, expect, beforeEach } from '@jest/globals';
import { makeObservable, observable, computed, action, runInAction, autorun } from 'mobx';
import { createSchemaModel } from '../SchemaModelImpl.js';
import { emptySchema, simpleSchema, findNodeIdByName, schemaWithFormula } from './test-helpers.js';
import type { ReactivityAdapter } from '../../../core/reactivity/index.js';
import type { AnnotationsMap } from '../../../core/types/index.js';

const createMobxAdapter = (): ReactivityAdapter => ({
  makeObservable<T extends object>(target: T, annotations: AnnotationsMap<T>): void {
    const mobxAnnotations: Record<string, unknown> = {};

    for (const [key, type] of Object.entries(annotations)) {
      switch (type) {
        case 'observable':
          mobxAnnotations[key] = observable;
          break;
        case 'observable.ref':
          mobxAnnotations[key] = observable.ref;
          break;
        case 'computed':
          mobxAnnotations[key] = computed;
          break;
        case 'action':
          mobxAnnotations[key] = action;
          break;
      }
    }

    makeObservable(target, mobxAnnotations as Record<string, typeof observable | typeof computed | typeof action>);
  },

  observableArray<T>(): T[] {
    return observable.array([]) as unknown as T[];
  },

  observableMap<K, V>(): Map<K, V> {
    return observable.map() as unknown as Map<K, V>;
  },

  reaction(): () => void {
    return () => {};
  },

  runInAction<T>(fn: () => T): T {
    return runInAction(fn);
  },
});

describe('SchemaModel computed properties', () => {
  describe('with reactivity (MobX)', () => {
    let mobxAdapter: ReactivityAdapter;

    beforeEach(() => {
      mobxAdapter = createMobxAdapter();
    });

    it('caches validationErrors result', () => {
      const model = createSchemaModel(simpleSchema(), { reactivity: mobxAdapter });

      let errors1: unknown, errors2: unknown;
      autorun(() => {
        errors1 = model.validationErrors;
        errors2 = model.validationErrors;
      });

      expect(errors1).toBe(errors2);
    });

    it('invalidates cache when tree changes', () => {
      const model = createSchemaModel(simpleSchema(), { reactivity: mobxAdapter });
      const nameId = findNodeIdByName(model, 'name');

      const errors1 = model.validationErrors;
      expect(errors1).toHaveLength(0);

      model.renameField(nameId!, '');

      const errors2 = model.validationErrors;
      expect(errors2).toHaveLength(1);
      expect(errors1).not.toBe(errors2);
    });

    it('caches formulaErrors result', () => {
      const model = createSchemaModel(schemaWithFormula(), { reactivity: mobxAdapter });

      let errors1: unknown, errors2: unknown;
      autorun(() => {
        errors1 = model.formulaErrors;
        errors2 = model.formulaErrors;
      });

      expect(errors1).toBe(errors2);
    });


    it('caches isValid result', () => {
      const model = createSchemaModel(simpleSchema(), { reactivity: mobxAdapter });

      expect(model.isValid).toBe(true);
      expect(model.isValid).toBe(true);
    });

    it('invalidates isValid cache when schema becomes invalid', () => {
      const model = createSchemaModel(simpleSchema(), { reactivity: mobxAdapter });
      const nameId = findNodeIdByName(model, 'name');

      expect(model.isValid).toBe(true);

      model.renameField(nameId!, '');

      expect(model.isValid).toBe(false);
    });

    it('caches nodeCount result', () => {
      const model = createSchemaModel(simpleSchema(), { reactivity: mobxAdapter });

      expect(model.nodeCount).toBe(3);
      expect(model.nodeCount).toBe(3);
    });

    it('updates nodeCount when field added', () => {
      const model = createSchemaModel(simpleSchema(), { reactivity: mobxAdapter });

      expect(model.nodeCount).toBe(3);

      model.addField(model.root.id(), 'email', 'string');

      expect(model.nodeCount).toBe(4);
    });

    it('updates nodeCount when field removed', () => {
      const model = createSchemaModel(simpleSchema(), { reactivity: mobxAdapter });
      const nameId = findNodeIdByName(model, 'name');

      expect(model.nodeCount).toBe(3);

      model.removeField(nameId!);

      expect(model.nodeCount).toBe(2);
    });

    it('nodeCount returns correct value for empty schema', () => {
      const model = createSchemaModel(emptySchema(), { reactivity: mobxAdapter });

      expect(model.nodeCount).toBe(1);
    });
  });

  describe('without reactivity', () => {
    it('validationErrors recalculates each time', () => {
      const model = createSchemaModel(simpleSchema());

      const errors1 = model.validationErrors;
      const errors2 = model.validationErrors;

      expect(errors1).not.toBe(errors2);
      expect(errors1).toEqual(errors2);
    });

    it('formulaErrors recalculates each time', () => {
      const model = createSchemaModel(schemaWithFormula());

      const errors1 = model.formulaErrors;
      const errors2 = model.formulaErrors;

      expect(errors1).not.toBe(errors2);
      expect(errors1).toEqual(errors2);
    });

    it('isValid works correctly', () => {
      const model = createSchemaModel(simpleSchema());
      const nameId = findNodeIdByName(model, 'name');

      expect(model.isValid).toBe(true);

      model.renameField(nameId!, '');

      expect(model.isValid).toBe(false);
    });

    it('nodeCount works correctly', () => {
      const model = createSchemaModel(simpleSchema());

      expect(model.nodeCount).toBe(3);

      model.addField(model.root.id(), 'email', 'string');

      expect(model.nodeCount).toBe(4);
    });
  });
});
