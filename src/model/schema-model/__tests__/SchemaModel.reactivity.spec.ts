import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { createSchemaModel } from '../SchemaModelImpl.js';
import { simpleSchema, emptySchema, findNodeIdByName } from './test-helpers.js';
import type { ReactivityAdapter } from '../../../core/reactivity/index.js';

describe('SchemaModel reactivity', () => {
  let mockAdapter: ReactivityAdapter;
  let makeObservableSpy: jest.Mock;

  beforeEach(() => {
    makeObservableSpy = jest.fn();
    mockAdapter = {
      makeObservable: makeObservableSpy,
      observableArray: () => [],
      observableMap: () => new Map(),
      reaction: () => () => {},
      runInAction: <T>(fn: () => T) => fn(),
    };
  });

  describe('initialization with reactivity', () => {
    type MockCall = [unknown, Record<string, string>];

    it('calls makeObservable for model and nodes when adapter provided', () => {
      createSchemaModel(emptySchema(), { reactivity: mockAdapter });

      expect(makeObservableSpy).toHaveBeenCalled();
      const calls = makeObservableSpy.mock.calls as MockCall[];
      const modelCall = calls.find((call) => call[1]?.['_currentTree'] !== undefined);
      expect(modelCall).toBeDefined();
    });

    it('passes correct annotations to makeObservable for model', () => {
      createSchemaModel(emptySchema(), { reactivity: mockAdapter });

      const calls = makeObservableSpy.mock.calls as MockCall[];
      const modelCall = calls.find((call) => call[1]?.['_currentTree'] !== undefined);
      expect(modelCall).toBeDefined();

      const [target, annotations] = modelCall!;

      expect(target).toBeDefined();
      expect(annotations['_currentTree']).toBe('observable.ref');
      expect(annotations['_baseTree']).toBe('observable.ref');
      expect(annotations['root']).toBe('computed');
      expect(annotations['isDirty']).toBe('computed');
      expect(annotations['addField']).toBe('action');
      expect(annotations['removeField']).toBe('action');
      expect(annotations['markAsSaved']).toBe('action');
      expect(annotations['revert']).toBe('action');
    });

    it('calls makeObservable for nodes when adapter provided', () => {
      createSchemaModel(emptySchema(), { reactivity: mockAdapter });

      const calls = makeObservableSpy.mock.calls as MockCall[];
      const nodeCall = calls.find((call) => call[1]?.['_children'] !== undefined);
      expect(nodeCall).toBeDefined();
      const [, annotations] = nodeCall!;
      expect(annotations['_children']).toBe('observable.shallow');
      expect(annotations['addChild']).toBe('action');
    });

    it('does not call makeObservable when no adapter', () => {
      createSchemaModel(emptySchema());

      expect(makeObservableSpy).not.toHaveBeenCalled();
    });
  });

  describe('operations with reactivity', () => {
    it('addField works with reactive model', () => {
      const model = createSchemaModel(emptySchema(), { reactivity: mockAdapter });
      const rootId = model.root.id();

      model.addField(rootId, 'field', 'string');

      expect(model.root.properties()).toHaveLength(1);
    });

    it('removeField works with reactive model', () => {
      const model = createSchemaModel(simpleSchema(), { reactivity: mockAdapter });
      const nameId = findNodeIdByName(model, 'name');

      model.removeField(nameId!);

      expect(model.root.properties()).toHaveLength(1);
    });

    it('markAsSaved works with reactive model', () => {
      const model = createSchemaModel(emptySchema(), { reactivity: mockAdapter });
      const rootId = model.root.id();

      model.addField(rootId, 'field', 'string');
      model.markAsSaved();

      expect(model.isDirty).toBe(false);
    });

    it('revert works with reactive model', () => {
      const model = createSchemaModel(emptySchema(), { reactivity: mockAdapter });
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
