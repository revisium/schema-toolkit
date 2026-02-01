import { describe, it, expect } from '@jest/globals';
import { ChangeCoalescer } from '../ChangeCoalescer.js';
import { NodePathIndex } from '../NodePathIndex.js';
import { collectChanges } from '../ChangeCollector.js';
import { createSchemaTree } from '../../schema-tree/index.js';
import {
  createObjectNode,
  createStringNode,
  createNumberNode,
} from '../../schema-node/index.js';

describe('ChangeCoalescer', () => {
  describe('filtering nested changes', () => {
    it('returns single add for parent when adding nested structure', () => {
      const baseRoot = createObjectNode('root', 'root', [
        createStringNode('existing', 'existing'),
      ]);
      const parentNode = createObjectNode('parent', 'parent', [
        createStringNode('child1', 'child1'),
        createStringNode('child2', 'child2'),
      ]);
      const currentRoot = createObjectNode('root', 'root', [
        createStringNode('existing', 'existing'),
        parentNode,
      ]);

      const baseTree = createSchemaTree(baseRoot);
      const currentTree = createSchemaTree(currentRoot);
      const index = new NodePathIndex(baseTree);

      const rawChanges = collectChanges(baseTree, currentTree, index);
      const coalescer = new ChangeCoalescer(currentTree, index);
      const coalesced = coalescer.coalesce(rawChanges);

      expect(coalesced.added).toHaveLength(1);
      expect(coalesced.added[0]?.currentNode?.name()).toBe('parent');
    });

    it('returns single remove for parent when removing nested structure', () => {
      const baseRoot = createObjectNode('root', 'root', [
        createObjectNode('parent', 'parent', [
          createStringNode('child1', 'child1'),
          createObjectNode('nested', 'nested', [
            createStringNode('grandchild', 'grandchild'),
          ]),
        ]),
      ]);
      const currentRoot = createObjectNode('root', 'root', []);

      const baseTree = createSchemaTree(baseRoot);
      const currentTree = createSchemaTree(currentRoot);
      const index = new NodePathIndex(baseTree);

      const rawChanges = collectChanges(baseTree, currentTree, index);
      const coalescer = new ChangeCoalescer(currentTree, index);
      const coalesced = coalescer.coalesce(rawChanges);

      expect(coalesced.removed).toHaveLength(1);
      expect(coalesced.removed[0]?.baseNode?.name()).toBe('parent');
    });
  });

  describe('move coalescing', () => {
    it('returns single move for renamed parent with children', () => {
      const baseRoot = createObjectNode('root', 'root', [
        createObjectNode('old-parent', 'oldParent', [
          createStringNode('child1', 'child1'),
          createStringNode('child2', 'child2'),
        ]),
      ]);
      const currentRoot = createObjectNode('root', 'root', [
        createObjectNode('old-parent', 'newParent', [
          createStringNode('child1', 'child1'),
          createStringNode('child2', 'child2'),
        ]),
      ]);

      const baseTree = createSchemaTree(baseRoot);
      const currentTree = createSchemaTree(currentRoot);
      const index = new NodePathIndex(baseTree);

      const rawChanges = collectChanges(baseTree, currentTree, index);
      const coalescer = new ChangeCoalescer(currentTree, index);
      const coalesced = coalescer.coalesce(rawChanges);

      expect(coalesced.moved).toHaveLength(1);
      expect(coalesced.moved[0]?.currentNode?.name()).toBe('newParent');
    });
  });

  describe('independent changes', () => {
    it('preserves multiple independent top-level changes', () => {
      const baseRoot = createObjectNode('root', 'root', [
        createStringNode('fieldA', 'fieldA', { defaultValue: 'old' }),
        createStringNode('fieldB', 'fieldB'),
      ]);
      const currentRoot = createObjectNode('root', 'root', [
        createStringNode('fieldA', 'fieldA', { defaultValue: 'new' }),
        createNumberNode('new-field', 'newField'),
      ]);

      const baseTree = createSchemaTree(baseRoot);
      const currentTree = createSchemaTree(currentRoot);
      const index = new NodePathIndex(baseTree);

      const rawChanges = collectChanges(baseTree, currentTree, index);
      const coalescer = new ChangeCoalescer(currentTree, index);
      const coalesced = coalescer.coalesce(rawChanges);

      const fieldAModified = coalesced.modified.find(
        (c) => c.currentNode?.name() === 'fieldA',
      );
      expect(fieldAModified).toBeDefined();

      expect(coalesced.added).toHaveLength(1);
      expect(coalesced.removed).toHaveLength(1);
    });
  });

  describe('add then remove same node', () => {
    it('results in no changes when node is added and then removed', () => {
      const root = createObjectNode('root', 'root', [
        createStringNode('existing', 'existing'),
      ]);

      const baseTree = createSchemaTree(root);
      const currentTree = baseTree.clone();
      const index = new NodePathIndex(baseTree);

      const rawChanges = collectChanges(baseTree, currentTree, index);
      const coalescer = new ChangeCoalescer(currentTree, index);
      const coalesced = coalescer.coalesce(rawChanges);

      expect(coalesced.added).toHaveLength(0);
      expect(coalesced.removed).toHaveLength(0);
      expect(coalesced.moved).toHaveLength(0);
      expect(coalesced.modified).toHaveLength(0);
    });
  });
});
