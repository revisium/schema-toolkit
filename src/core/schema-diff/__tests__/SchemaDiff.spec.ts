import { describe, it, expect } from '@jest/globals';
import { SchemaDiff } from '../SchemaDiff.js';
import { createSchemaTree } from '../../schema-tree/index.js';
import {
  createObjectNode,
  createStringNode,
  createNumberNode,
} from '../../schema-node/index.js';

describe('SchemaDiff', () => {
  describe('isDirty', () => {
    it('returns false when no changes', () => {
      const root = createObjectNode('root', 'root', [
        createStringNode('name', 'name'),
      ]);
      const tree = createSchemaTree(root);
      const diff = new SchemaDiff(tree);

      expect(diff.isDirty()).toBe(false);
    });

    it('returns false when trees are clones', () => {
      const root = createObjectNode('root', 'root', [
        createStringNode('name', 'name'),
        createNumberNode('age', 'age'),
      ]);
      const tree = createSchemaTree(root);
      const diff = new SchemaDiff(tree);

      expect(diff.isDirty()).toBe(false);
    });
  });

  describe('markAsSaved', () => {
    it('clears dirty state', () => {
      const root = createObjectNode('root', 'root', [
        createStringNode('name', 'name'),
      ]);
      const tree = createSchemaTree(root);
      const diff = new SchemaDiff(tree);

      expect(diff.isDirty()).toBe(false);

      diff.markAsSaved();

      expect(diff.isDirty()).toBe(false);
    });
  });

  describe('collectChanges', () => {
    it('returns all raw changes', () => {
      const baseRoot = createObjectNode('root', 'root', [
        createStringNode('name', 'name'),
        createStringNode('age', 'age'),
      ]);
      const baseTree = createSchemaTree(baseRoot);
      const diff = new SchemaDiff(baseTree);

      const changes = diff.collectChanges();
      expect(changes).toHaveLength(0);
    });
  });

  describe('coalesceChanges', () => {
    it('returns coalesced changes grouped by type', () => {
      const baseRoot = createObjectNode('root', 'root', [
        createStringNode('name', 'name'),
      ]);
      const baseTree = createSchemaTree(baseRoot);
      const diff = new SchemaDiff(baseTree);

      const coalesced = diff.coalesceChanges();

      expect(coalesced.added).toHaveLength(0);
      expect(coalesced.removed).toHaveLength(0);
      expect(coalesced.moved).toHaveLength(0);
      expect(coalesced.modified).toHaveLength(0);
    });
  });

  describe('trackReplacement', () => {
    it('tracks type changes via replacement', () => {
      const baseRoot = createObjectNode('root', 'root', [
        createStringNode('old-id', 'field'),
      ]);
      const baseTree = createSchemaTree(baseRoot);
      const diff = new SchemaDiff(baseTree);

      diff.trackReplacement('old-id', 'new-id');

      expect(diff.index.getReplacementNodeId('old-id')).toBe('new-id');
    });
  });

  describe('baseTree and currentTree', () => {
    it('provides access to both trees', () => {
      const root = createObjectNode('root', 'root', [
        createStringNode('name', 'name'),
      ]);
      const tree = createSchemaTree(root);
      const diff = new SchemaDiff(tree);

      expect(diff.baseTree).not.toBe(diff.currentTree);
      expect(diff.baseTree.root().id()).toBe('root');
      expect(diff.currentTree.root().id()).toBe('root');
    });

    it('baseTree is independent clone of currentTree', () => {
      const root = createObjectNode('root', 'root', [
        createStringNode('name', 'name'),
      ]);
      const tree = createSchemaTree(root);
      const diff = new SchemaDiff(tree);

      expect(diff.baseTree.root()).not.toBe(diff.currentTree.root());
    });
  });
});
