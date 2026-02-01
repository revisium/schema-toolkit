import { describe, it, expect, beforeEach } from '@jest/globals';
import { NodePathIndex } from '../NodePathIndex.js';
import { createTree, stringNode, resetIdCounter } from './test-helpers.js';

beforeEach(() => {
  resetIdCounter();
});

describe('NodePathIndex', () => {
  describe('hasBasePath', () => {
    it('returns true for nodes in base tree', () => {
      const node = stringNode('name');
      const tree = createTree([node]);
      const index = new NodePathIndex(tree);

      expect(index.hasBasePath(node.id())).toBe(true);
    });

    it('returns false for unknown nodes', () => {
      const tree = createTree([stringNode('name')]);
      const index = new NodePathIndex(tree);

      expect(index.hasBasePath('unknown-id')).toBe(false);
    });
  });

  describe('getBasePath', () => {
    it('returns path for known node', () => {
      const node = stringNode('name');
      const tree = createTree([node]);
      const index = new NodePathIndex(tree);

      const path = index.getBasePath(node.id());
      expect(path).toBeDefined();
      expect(path?.asSimple()).toBe('name');
    });

    it('returns undefined for unknown node', () => {
      const tree = createTree([stringNode('name')]);
      const index = new NodePathIndex(tree);

      expect(index.getBasePath('unknown-id')).toBeUndefined();
    });
  });

  describe('trackReplacement', () => {
    it('tracks replacement mapping', () => {
      const tree = createTree([stringNode('name')]);
      const index = new NodePathIndex(tree);

      index.trackReplacement('old-id', 'new-id');

      expect(index.getReplacementNodeId('old-id')).toBe('new-id');
    });
  });

  describe('getOriginalNodeId', () => {
    it('returns original id for replacement', () => {
      const tree = createTree([stringNode('name')]);
      const index = new NodePathIndex(tree);

      index.trackReplacement('old-id', 'new-id');

      expect(index.getOriginalNodeId('new-id')).toBe('old-id');
    });

    it('returns undefined when not a replacement', () => {
      const tree = createTree([stringNode('name')]);
      const index = new NodePathIndex(tree);

      expect(index.getOriginalNodeId('unknown-id')).toBeUndefined();
    });
  });

  describe('isReplacement', () => {
    it('returns true for replacement node', () => {
      const tree = createTree([stringNode('name')]);
      const index = new NodePathIndex(tree);

      index.trackReplacement('old-id', 'new-id');

      expect(index.isReplacement('new-id')).toBe(true);
    });

    it('returns false for non-replacement', () => {
      const tree = createTree([stringNode('name')]);
      const index = new NodePathIndex(tree);

      expect(index.isReplacement('some-id')).toBe(false);
    });
  });

  describe('replacements getter', () => {
    it('returns empty map initially', () => {
      const tree = createTree([stringNode('name')]);
      const index = new NodePathIndex(tree);

      expect(index.replacements.size).toBe(0);
    });

    it('returns tracked replacements', () => {
      const tree = createTree([stringNode('name')]);
      const index = new NodePathIndex(tree);

      index.trackReplacement('old1', 'new1');
      index.trackReplacement('old2', 'new2');

      expect(index.replacements.size).toBe(2);
      expect(index.replacements.get('old1')).toBe('new1');
      expect(index.replacements.get('old2')).toBe('new2');
    });
  });
});
