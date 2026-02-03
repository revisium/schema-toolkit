import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import type { ReactivityAdapter } from '../../reactivity/index.js';
import {
  createObjectNode,
  createArrayNode,
  createStringNode,
  createNumberNode,
  createBooleanNode,
  createRefNode,
  makeNodeReactive,
  makeTreeNodesReactive,
  getNodeAnnotations,
  NULL_NODE,
} from '../index.js';

describe('node reactivity', () => {
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

  describe('getNodeAnnotations', () => {
    it('returns correct annotations for string node', () => {
      const annotations = getNodeAnnotations('string');

      expect(annotations['_name']).toBe('observable');
      expect(annotations['_metadata']).toBe('observable.ref');
      expect(annotations['_formula']).toBe('observable.ref');
      expect(annotations['_defaultValue']).toBe('observable');
      expect(annotations['_foreignKey']).toBe('observable');
      expect(annotations['_contentMediaType']).toBe('observable');
      expect(annotations['setName']).toBe('action');
      expect(annotations['setFormula']).toBe('action');
      expect(annotations['setContentMediaType']).toBe('action');
    });

    it('returns correct annotations for number node', () => {
      const annotations = getNodeAnnotations('number');

      expect(annotations['_name']).toBe('observable');
      expect(annotations['_formula']).toBe('observable.ref');
      expect(annotations['_defaultValue']).toBe('observable');
      expect(annotations['setDefaultValue']).toBe('action');
    });

    it('returns correct annotations for boolean node', () => {
      const annotations = getNodeAnnotations('boolean');

      expect(annotations['_name']).toBe('observable');
      expect(annotations['_formula']).toBe('observable.ref');
      expect(annotations['_defaultValue']).toBe('observable');
    });

    it('returns correct annotations for object node', () => {
      const annotations = getNodeAnnotations('object');

      expect(annotations['_name']).toBe('observable');
      expect(annotations['_metadata']).toBe('observable.ref');
      expect(annotations['_children']).toBe('observable.shallow');
      expect(annotations['addChild']).toBe('action');
      expect(annotations['removeChild']).toBe('action');
      expect(annotations['replaceChild']).toBe('action');
    });

    it('returns correct annotations for array node', () => {
      const annotations = getNodeAnnotations('array');

      expect(annotations['_name']).toBe('observable');
      expect(annotations['_metadata']).toBe('observable.ref');
      expect(annotations['_items']).toBe('observable.ref');
      expect(annotations['setItems']).toBe('action');
    });

    it('returns correct annotations for ref node', () => {
      const annotations = getNodeAnnotations('ref');

      expect(annotations['_name']).toBe('observable');
      expect(annotations['_metadata']).toBe('observable.ref');
      expect(annotations['setName']).toBe('action');
      expect(annotations['setMetadata']).toBe('action');
    });

    it('returns empty annotations for null node', () => {
      const annotations = getNodeAnnotations('null');

      expect(Object.keys(annotations)).toHaveLength(0);
    });
  });

  describe('makeNodeReactive', () => {
    it('calls makeObservable for string node', () => {
      const node = createStringNode('id1', 'name', { defaultValue: '' });

      makeNodeReactive(node, mockAdapter);

      expect(makeObservableSpy).toHaveBeenCalledTimes(1);
      expect(makeObservableSpy).toHaveBeenCalledWith(node, expect.any(Object));
    });

    it('calls makeObservable for object node', () => {
      const node = createObjectNode('id1', 'obj', []);

      makeNodeReactive(node, mockAdapter);

      expect(makeObservableSpy).toHaveBeenCalledTimes(1);
      const [, annotations] = makeObservableSpy.mock.calls[0] as [
        unknown,
        Record<string, string>,
      ];
      expect(annotations['_children']).toBe('observable.shallow');
    });

    it('calls makeObservable for array node', () => {
      const items = createStringNode('items-id', 'items', { defaultValue: '' });
      const node = createArrayNode('id1', 'arr', items);

      makeNodeReactive(node, mockAdapter);

      expect(makeObservableSpy).toHaveBeenCalledTimes(1);
      const [, annotations] = makeObservableSpy.mock.calls[0] as [
        unknown,
        Record<string, string>,
      ];
      expect(annotations['_items']).toBe('observable.ref');
    });

    it('calls makeObservable for ref node', () => {
      const node = createRefNode('id1', 'ref', '#/definitions/Type');

      makeNodeReactive(node, mockAdapter);

      expect(makeObservableSpy).toHaveBeenCalledTimes(1);
    });

    it('skips null nodes', () => {
      makeNodeReactive(NULL_NODE, mockAdapter);

      expect(makeObservableSpy).not.toHaveBeenCalled();
    });
  });

  describe('makeTreeNodesReactive', () => {
    it('applies reactivity to all nodes in tree', () => {
      const child1 = createStringNode('c1', 'name', { defaultValue: '' });
      const child2 = createNumberNode('c2', 'age', { defaultValue: 0 });
      const root = createObjectNode('root', 'root', [child1, child2]);

      makeTreeNodesReactive(root, mockAdapter);

      expect(makeObservableSpy).toHaveBeenCalledTimes(3);
    });

    it('handles nested objects', () => {
      const nested = createStringNode('nested', 'field', { defaultValue: '' });
      const obj = createObjectNode('obj', 'inner', [nested]);
      const root = createObjectNode('root', 'root', [obj]);

      makeTreeNodesReactive(root, mockAdapter);

      expect(makeObservableSpy).toHaveBeenCalledTimes(3);
    });

    it('handles arrays', () => {
      const items = createStringNode('items', 'items', { defaultValue: '' });
      const arr = createArrayNode('arr', 'list', items);
      const root = createObjectNode('root', 'root', [arr]);

      makeTreeNodesReactive(root, mockAdapter);

      expect(makeObservableSpy).toHaveBeenCalledTimes(3);
    });

    it('handles deeply nested structures', () => {
      const leaf = createBooleanNode('leaf', 'active', { defaultValue: false });
      const items = createObjectNode('items', 'items', [leaf]);
      const arr = createArrayNode('arr', 'users', items);
      const obj = createObjectNode('obj', 'data', [arr]);
      const root = createObjectNode('root', 'root', [obj]);

      makeTreeNodesReactive(root, mockAdapter);

      expect(makeObservableSpy).toHaveBeenCalledTimes(5);
    });
  });
});
