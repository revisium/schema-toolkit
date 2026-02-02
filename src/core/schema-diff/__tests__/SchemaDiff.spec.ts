import { describe, it, expect, beforeEach } from '@jest/globals';
import { SchemaDiff } from '../SchemaDiff.js';
import { createSchemaTree } from '../../schema-tree/index.js';
import {
  createObjectNode,
  createStringNode,
  createNumberNode,
} from '../../schema-node/index.js';
import { PatchBuilder } from '../../schema-patch/index.js';
import {
  resetIdCounter,
  createTreeAndDiff,
  numberNode,
  numberNodeWithFormula,
  createMockFormula,
} from './test-helpers.js';

const builder = new PatchBuilder();

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

  describe('formula changes', () => {
    beforeEach(() => {
      resetIdCounter();
    });

    it('detects formula removal', () => {
      const { tree, diff } = createTreeAndDiff([
        numberNode('value'),
        numberNodeWithFormula('computed', 'value * 2'),
      ]);

      const computedNode = tree.root().property('computed');
      const path = tree.pathOf(computedNode.id());
      tree.removeNodeAt(path);

      const newNode = createNumberNode('new-computed', 'computed', { defaultValue: 0 });
      tree.addChildTo(tree.root().id(), newNode);
      tree.trackReplacement(computedNode.id(), newNode.id());

      const patches = builder.build(tree, diff.baseTree);

      expect(patches).toHaveLength(1);
      const patch = patches[0];
      expect(patch).toBeDefined();
      expect(patch).toMatchObject({
        fieldName: 'computed',
        patch: { op: 'replace', path: '/properties/computed' },
      });
      expect(patch?.formulaChange).toMatchObject({
        fromFormula: 'value * 2',
        toFormula: undefined,
      });
    });

    it('detects formula addition', () => {
      const { tree, diff } = createTreeAndDiff([
        numberNode('value'),
        numberNode('computed'),
      ]);

      const computedNode = tree.root().property('computed');
      const formula = createMockFormula(1, 'value * 2');
      computedNode.setFormula(formula);

      const patches = builder.build(tree, diff.baseTree);

      expect(patches).toHaveLength(1);
      const patch = patches[0];
      expect(patch).toBeDefined();
      expect(patch).toMatchObject({
        fieldName: 'computed',
        patch: { op: 'replace', path: '/properties/computed' },
      });
      expect(patch?.formulaChange).toMatchObject({
        fromFormula: undefined,
        toFormula: 'value * 2',
      });
    });

    it('detects formula expression change', () => {
      const { tree, diff } = createTreeAndDiff([
        numberNode('value'),
        numberNodeWithFormula('computed', 'value * 2'),
      ]);

      const computedNode = tree.root().property('computed');
      const newFormula = createMockFormula(1, 'value * 3');
      computedNode.setFormula(newFormula);

      const patches = builder.build(tree, diff.baseTree);

      expect(patches).toHaveLength(1);
      const patch = patches[0];
      expect(patch).toBeDefined();
      expect(patch).toMatchObject({
        fieldName: 'computed',
        patch: { op: 'replace', path: '/properties/computed' },
      });
      expect(patch?.formulaChange).toMatchObject({
        fromFormula: 'value * 2',
        toFormula: 'value * 3',
      });
    });

    it('includes formula in add patch when field has formula', () => {
      const { tree, diff } = createTreeAndDiff([
        numberNode('value'),
      ]);

      const newNode = createNumberNode('computed-id', 'computed', {
        defaultValue: 0,
        formula: createMockFormula(1, 'value * 2'),
      });
      tree.addChildTo(tree.root().id(), newNode);

      const patches = builder.build(tree, diff.baseTree);

      expect(patches).toHaveLength(1);
      const patch = patches[0];
      expect(patch).toBeDefined();
      expect(patch).toMatchObject({
        fieldName: 'computed',
        patch: { op: 'add', path: '/properties/computed' },
      });
      expect(patch?.formulaChange).toMatchObject({
        fromFormula: undefined,
        toFormula: 'value * 2',
      });
    });

    it('does not report formula change when formula is unchanged', () => {
      const { tree, diff } = createTreeAndDiff([
        numberNode('value'),
        numberNodeWithFormula('computed', 'value * 2'),
      ]);

      const computedNode = tree.root().property('computed');
      computedNode.setDefaultValue(100);

      const patches = builder.build(tree, diff.baseTree);

      expect(patches).toHaveLength(1);
      const patch = patches[0];
      expect(patch).toBeDefined();
      expect(patch).toMatchObject({
        fieldName: 'computed',
        patch: { op: 'replace', path: '/properties/computed' },
      });
      expect(patch?.formulaChange).toBeUndefined();
      expect(patch?.defaultChange).toMatchObject({
        fromDefault: 0,
        toDefault: 100,
      });
    });
  });
});
