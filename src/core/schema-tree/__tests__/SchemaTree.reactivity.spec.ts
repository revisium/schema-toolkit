import { describe, it, expect } from '@jest/globals';
import { autorun } from 'mobx';
import { createSchemaTree } from '../index.js';
import {
  createObjectNode,
  createStringNode,
  createNumberNode,
} from '../../schema-node/index.js';
import { jsonPointerToPath } from '../../path/index.js';

describe('SchemaTree reactivity', () => {
  describe('root reactivity', () => {
    it('root() is reactive to addChildTo', () => {
      const root = createObjectNode('root-id', 'root');
      const tree = createSchemaTree(root);

      let observedChildCount = 0;
      const dispose = autorun(() => {
        observedChildCount = tree.root().properties().length;
      });

      expect(observedChildCount).toBe(0);

      const newNode = createStringNode('new-id', 'field');
      tree.addChildTo('root-id', newNode);

      expect(observedChildCount).toBe(1);

      dispose();
    });

    it('root() is reactive to removeNodeAt', () => {
      const nameNode = createStringNode('name-id', 'name');
      const root = createObjectNode('root-id', 'root', [nameNode]);
      const tree = createSchemaTree(root);

      let observedChildCount = 0;
      const dispose = autorun(() => {
        observedChildCount = tree.root().properties().length;
      });

      expect(observedChildCount).toBe(1);

      tree.removeNodeAt(jsonPointerToPath('/properties/name'));

      expect(observedChildCount).toBe(0);

      dispose();
    });

    it('root() is reactive to setNodeAt', () => {
      const oldNode = createStringNode('old-id', 'field');
      const root = createObjectNode('root-id', 'root', [oldNode]);
      const tree = createSchemaTree(root);

      let observedNodeType = '';
      const dispose = autorun(() => {
        const field = tree.root().property('field');
        observedNodeType = field.nodeType();
      });

      expect(observedNodeType).toBe('string');

      const newNode = createNumberNode('new-id', 'field');
      tree.setNodeAt(jsonPointerToPath('/properties/field'), newNode);

      expect(observedNodeType).toBe('number');

      dispose();
    });

    it('root() is reactive to replaceRoot', () => {
      const root = createObjectNode('root-id', 'root');
      const tree = createSchemaTree(root);

      let observedRootId = '';
      const dispose = autorun(() => {
        observedRootId = tree.root().id();
      });

      expect(observedRootId).toBe('root-id');

      const newRoot = createObjectNode('new-root-id', 'root');
      tree.replaceRoot(newRoot);

      expect(observedRootId).toBe('new-root-id');

      dispose();
    });

    it('root() is reactive to renameNode', () => {
      const nameNode = createStringNode('name-id', 'name');
      const root = createObjectNode('root-id', 'root', [nameNode]);
      const tree = createSchemaTree(root);

      let observedFieldName = '';
      const dispose = autorun(() => {
        const props = tree.root().properties();
        const firstProp = props[0];
        if (firstProp) {
          observedFieldName = firstProp.name();
        }
      });

      expect(observedFieldName).toBe('name');

      tree.renameNode('name-id', 'newName');

      expect(observedFieldName).toBe('newName');

      dispose();
    });
  });

  describe('nodeById reactivity', () => {
    it('nodeById() reflects changes after addChildTo', () => {
      const root = createObjectNode('root-id', 'root');
      const tree = createSchemaTree(root);

      let observedNode = tree.nodeById('new-id');
      const dispose = autorun(() => {
        observedNode = tree.nodeById('new-id');
      });

      expect(observedNode.isNull()).toBe(true);

      const newNode = createStringNode('new-id', 'field');
      tree.addChildTo('root-id', newNode);

      expect(observedNode.isNull()).toBe(false);
      expect(observedNode.id()).toBe('new-id');

      dispose();
    });
  });

  describe('pathOf reactivity', () => {
    it('pathOf() reflects changes after renameNode', () => {
      const nameNode = createStringNode('name-id', 'name');
      const root = createObjectNode('root-id', 'root', [nameNode]);
      const tree = createSchemaTree(root);

      let observedPath = '';
      const dispose = autorun(() => {
        observedPath = tree.pathOf('name-id').asJsonPointer();
      });

      expect(observedPath).toBe('/properties/name');

      tree.renameNode('name-id', 'newName');

      expect(observedPath).toBe('/properties/newName');

      dispose();
    });

    it('pathOf() reflects changes after moveNode', () => {
      const fieldNode = createStringNode('field-id', 'field');
      const targetNode = createObjectNode('target-id', 'target');
      const root = createObjectNode('root-id', 'root', [fieldNode, targetNode]);
      const tree = createSchemaTree(root);

      let observedPath = '';
      const dispose = autorun(() => {
        observedPath = tree.pathOf('field-id').asJsonPointer();
      });

      expect(observedPath).toBe('/properties/field');

      tree.moveNode('field-id', 'target-id');

      expect(observedPath).toBe('/properties/target/properties/field');

      dispose();
    });
  });

  describe('countNodes reactivity', () => {
    it('countNodes() is reactive to addChildTo', () => {
      const root = createObjectNode('root-id', 'root');
      const tree = createSchemaTree(root);

      let observedCount = 0;
      const dispose = autorun(() => {
        observedCount = tree.countNodes();
      });

      expect(observedCount).toBe(1);

      const newNode = createStringNode('new-id', 'field');
      tree.addChildTo('root-id', newNode);

      expect(observedCount).toBe(2);

      dispose();
    });
  });
});
