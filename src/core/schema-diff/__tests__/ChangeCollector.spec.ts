import { describe, it, expect } from '@jest/globals';
import { ChangeCollector } from '../ChangeCollector.js';
import { NodePathIndex } from '../NodePathIndex.js';
import { createSchemaTree } from '../../schema-tree/index.js';
import {
  createObjectNode,
  createStringNode,
  createNumberNode,
  createArrayNode,
} from '../../schema-node/index.js';

describe('ChangeCollector', () => {
  describe('no changes', () => {
    it('returns empty array when trees are identical', () => {
      const root = createObjectNode('root', 'root', [
        createStringNode('name', 'name', { defaultValue: 'test' }),
      ]);
      const baseTree = createSchemaTree(root);
      const currentTree = baseTree.clone();
      const index = new NodePathIndex(baseTree);

      const collector = new ChangeCollector(baseTree, currentTree, index);
      const changes = collector.collect();

      expect(changes).toHaveLength(0);
    });
  });

  describe('added nodes', () => {
    it('detects added top-level field with parent modified', () => {
      const baseRoot = createObjectNode('root', 'root', [
        createStringNode('name', 'name'),
      ]);
      const currentRoot = createObjectNode('root', 'root', [
        createStringNode('name', 'name'),
        createStringNode('new-field', 'newField'),
      ]);

      const baseTree = createSchemaTree(baseRoot);
      const currentTree = createSchemaTree(currentRoot);
      const index = new NodePathIndex(baseTree);

      const collector = new ChangeCollector(baseTree, currentTree, index);
      const changes = collector.collect();

      const addedChanges = changes.filter((c) => c.type === 'added');
      expect(addedChanges).toHaveLength(1);
      expect(addedChanges[0]?.currentNode?.name()).toBe('newField');
      expect(addedChanges[0]?.baseNode).toBeNull();
    });

    it('detects added nested field with parent modified', () => {
      const baseRoot = createObjectNode('root', 'root', [
        createObjectNode('nested', 'nested', []),
      ]);
      const currentRoot = createObjectNode('root', 'root', [
        createObjectNode('nested', 'nested', [
          createStringNode('new-field', 'newField'),
        ]),
      ]);

      const baseTree = createSchemaTree(baseRoot);
      const currentTree = createSchemaTree(currentRoot);
      const index = new NodePathIndex(baseTree);

      const collector = new ChangeCollector(baseTree, currentTree, index);
      const changes = collector.collect();

      const addedChanges = changes.filter((c) => c.type === 'added');
      expect(addedChanges).toHaveLength(1);
      expect(addedChanges[0]?.currentNode?.name()).toBe('newField');
    });
  });

  describe('removed nodes', () => {
    it('detects removed top-level field with parent modified', () => {
      const baseRoot = createObjectNode('root', 'root', [
        createStringNode('name', 'name'),
        createStringNode('age', 'age'),
      ]);
      const currentRoot = createObjectNode('root', 'root', [
        createStringNode('name', 'name'),
      ]);

      const baseTree = createSchemaTree(baseRoot);
      const currentTree = createSchemaTree(currentRoot);
      const index = new NodePathIndex(baseTree);

      const collector = new ChangeCollector(baseTree, currentTree, index);
      const changes = collector.collect();

      const removedChanges = changes.filter((c) => c.type === 'removed');
      expect(removedChanges).toHaveLength(1);
      expect(removedChanges[0]?.baseNode?.name()).toBe('age');
      expect(removedChanges[0]?.currentNode).toBeNull();
    });

    it('detects removed nested field with parent modified', () => {
      const baseRoot = createObjectNode('root', 'root', [
        createObjectNode('nested', 'nested', [
          createStringNode('field', 'field'),
        ]),
      ]);
      const currentRoot = createObjectNode('root', 'root', [
        createObjectNode('nested', 'nested', []),
      ]);

      const baseTree = createSchemaTree(baseRoot);
      const currentTree = createSchemaTree(currentRoot);
      const index = new NodePathIndex(baseTree);

      const collector = new ChangeCollector(baseTree, currentTree, index);
      const changes = collector.collect();

      const removedChanges = changes.filter((c) => c.type === 'removed');
      expect(removedChanges).toHaveLength(1);
      expect(removedChanges[0]?.baseNode?.name()).toBe('field');
    });
  });

  describe('modified nodes', () => {
    it('detects modified default value', () => {
      const baseRoot = createObjectNode('root', 'root', [
        createStringNode('name', 'name', { defaultValue: 'old' }),
      ]);
      const currentRoot = createObjectNode('root', 'root', [
        createStringNode('name', 'name', { defaultValue: 'new' }),
      ]);

      const baseTree = createSchemaTree(baseRoot);
      const currentTree = createSchemaTree(currentRoot);
      const index = new NodePathIndex(baseTree);

      const collector = new ChangeCollector(baseTree, currentTree, index);
      const changes = collector.collect();

      const modifiedChanges = changes.filter((c) => c.type === 'modified');
      const fieldChange = modifiedChanges.find(
        (c) => c.currentNode?.name() === 'name',
      );
      expect(fieldChange).toBeDefined();
      expect(fieldChange?.baseNode?.defaultValue()).toBe('old');
      expect(fieldChange?.currentNode?.defaultValue()).toBe('new');
    });

    it('detects modified metadata', () => {
      const baseRoot = createObjectNode('root', 'root', [
        createStringNode('name', 'name'),
      ]);
      const currentRoot = createObjectNode('root', 'root', [
        createStringNode('name', 'name', { metadata: { description: 'new' } }),
      ]);

      const baseTree = createSchemaTree(baseRoot);
      const currentTree = createSchemaTree(currentRoot);
      const index = new NodePathIndex(baseTree);

      const collector = new ChangeCollector(baseTree, currentTree, index);
      const changes = collector.collect();

      const modifiedChanges = changes.filter((c) => c.type === 'modified');
      const fieldChange = modifiedChanges.find(
        (c) => c.currentNode?.name() === 'name',
      );
      expect(fieldChange).toBeDefined();
    });
  });

  describe('contentMediaType changes', () => {
    it('detects modified contentMediaType', () => {
      const baseRoot = createObjectNode('root', 'root', [
        createStringNode('name', 'name'),
      ]);
      const currentRoot = createObjectNode('root', 'root', [
        createStringNode('name', 'name', { contentMediaType: 'text/markdown' }),
      ]);

      const baseTree = createSchemaTree(baseRoot);
      const currentTree = createSchemaTree(currentRoot);
      const index = new NodePathIndex(baseTree);

      const collector = new ChangeCollector(baseTree, currentTree, index);
      const changes = collector.collect();

      const modifiedChanges = changes.filter((c) => c.type === 'modified');
      const fieldChange = modifiedChanges.find(
        (c) => c.currentNode?.name() === 'name',
      );
      expect(fieldChange).toBeDefined();
      expect(fieldChange?.baseNode?.contentMediaType()).toBeUndefined();
      expect(fieldChange?.currentNode?.contentMediaType()).toBe('text/markdown');
    });

    it('detects contentMediaType change between types', () => {
      const baseRoot = createObjectNode('root', 'root', [
        createStringNode('name', 'name', { contentMediaType: 'text/plain' }),
      ]);
      const currentRoot = createObjectNode('root', 'root', [
        createStringNode('name', 'name', { contentMediaType: 'text/markdown' }),
      ]);

      const baseTree = createSchemaTree(baseRoot);
      const currentTree = createSchemaTree(currentRoot);
      const index = new NodePathIndex(baseTree);

      const collector = new ChangeCollector(baseTree, currentTree, index);
      const changes = collector.collect();

      const modifiedChanges = changes.filter((c) => c.type === 'modified');
      const fieldChange = modifiedChanges.find(
        (c) => c.currentNode?.name() === 'name',
      );
      expect(fieldChange).toBeDefined();
      expect(fieldChange?.baseNode?.contentMediaType()).toBe('text/plain');
      expect(fieldChange?.currentNode?.contentMediaType()).toBe('text/markdown');
    });

    it('detects contentMediaType removal', () => {
      const baseRoot = createObjectNode('root', 'root', [
        createStringNode('name', 'name', { contentMediaType: 'text/markdown' }),
      ]);
      const currentRoot = createObjectNode('root', 'root', [
        createStringNode('name', 'name'),
      ]);

      const baseTree = createSchemaTree(baseRoot);
      const currentTree = createSchemaTree(currentRoot);
      const index = new NodePathIndex(baseTree);

      const collector = new ChangeCollector(baseTree, currentTree, index);
      const changes = collector.collect();

      const modifiedChanges = changes.filter((c) => c.type === 'modified');
      const fieldChange = modifiedChanges.find(
        (c) => c.currentNode?.name() === 'name',
      );
      expect(fieldChange).toBeDefined();
      expect(fieldChange?.baseNode?.contentMediaType()).toBe('text/markdown');
      expect(fieldChange?.currentNode?.contentMediaType()).toBeUndefined();
    });
  });

  describe('moved nodes (renamed)', () => {
    it('detects renamed field as moved only when content unchanged', () => {
      const baseRoot = createObjectNode('root', 'root', [
        createStringNode('field-id', 'oldName'),
      ]);
      const currentRoot = createObjectNode('root', 'root', [
        createStringNode('field-id', 'newName'),
      ]);

      const baseTree = createSchemaTree(baseRoot);
      const currentTree = createSchemaTree(currentRoot);
      const index = new NodePathIndex(baseTree);

      const collector = new ChangeCollector(baseTree, currentTree, index);
      const changes = collector.collect();

      const movedChanges = changes.filter((c) => c.type === 'moved');
      expect(movedChanges).toHaveLength(1);
      expect(movedChanges[0]?.baseNode?.name()).toBe('oldName');
      expect(movedChanges[0]?.currentNode?.name()).toBe('newName');

      const modifiedChanges = changes.filter(
        (c) => c.type === 'modified' && c.currentNode?.name() === 'newName',
      );
      expect(modifiedChanges).toHaveLength(0);
    });

    it('detects renamed field as moved plus modified when content changed', () => {
      const baseRoot = createObjectNode('root', 'root', [
        createStringNode('field-id', 'oldName', { defaultValue: 'old' }),
      ]);
      const currentRoot = createObjectNode('root', 'root', [
        createStringNode('field-id', 'newName', { defaultValue: 'new' }),
      ]);

      const baseTree = createSchemaTree(baseRoot);
      const currentTree = createSchemaTree(currentRoot);
      const index = new NodePathIndex(baseTree);

      const collector = new ChangeCollector(baseTree, currentTree, index);
      const changes = collector.collect();

      const movedChanges = changes.filter((c) => c.type === 'moved');
      expect(movedChanges).toHaveLength(1);

      const modifiedChanges = changes.filter(
        (c) => c.type === 'modified' && c.currentNode?.name() === 'newName',
      );
      expect(modifiedChanges).toHaveLength(1);
    });
  });

  describe('type changes via replacement', () => {
    it('detects type change when tracked as replacement', () => {
      const baseRoot = createObjectNode('root', 'root', [
        createStringNode('old-field', 'field'),
      ]);
      const currentRoot = createObjectNode('root', 'root', [
        createNumberNode('new-field', 'field'),
      ]);

      const baseTree = createSchemaTree(baseRoot);
      const currentTree = createSchemaTree(currentRoot);
      const index = new NodePathIndex(baseTree);
      index.trackReplacement('old-field', 'new-field');

      const collector = new ChangeCollector(baseTree, currentTree, index);
      const changes = collector.collect();

      const modifiedChanges = changes.filter((c) => c.type === 'modified');
      const typeChange = modifiedChanges.find(
        (c) => c.currentNode?.name() === 'field',
      );
      expect(typeChange).toBeDefined();
      expect(typeChange?.baseNode?.nodeType()).toBe('string');
      expect(typeChange?.currentNode?.nodeType()).toBe('number');
    });
  });

  describe('array items', () => {
    it('detects modified array items', () => {
      const baseRoot = createObjectNode('root', 'root', [
        createArrayNode(
          'items',
          'items',
          createStringNode('item', 'item', { defaultValue: 'old' }),
        ),
      ]);
      const currentRoot = createObjectNode('root', 'root', [
        createArrayNode(
          'items',
          'items',
          createStringNode('item', 'item', { defaultValue: 'new' }),
        ),
      ]);

      const baseTree = createSchemaTree(baseRoot);
      const currentTree = createSchemaTree(currentRoot);
      const index = new NodePathIndex(baseTree);

      const collector = new ChangeCollector(baseTree, currentTree, index);
      const changes = collector.collect();

      const modifiedChanges = changes.filter((c) => c.type === 'modified');
      const itemChange = modifiedChanges.find(
        (c) => c.currentNode?.name() === 'item',
      );
      expect(itemChange).toBeDefined();
    });
  });
});
