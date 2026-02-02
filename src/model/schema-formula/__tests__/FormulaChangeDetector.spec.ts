import { describe, it, expect, beforeEach } from '@jest/globals';
import { FormulaChangeDetector } from '../changes/FormulaChangeDetector.js';
import { FormulaDependencyIndex } from '../store/FormulaDependencyIndex.js';
import { ParsedFormula } from '../parsing/ParsedFormula.js';
import {
  createObjectNode,
  createNumberNode,
} from '../../../core/schema-node/index.js';
import { createSchemaTree } from '../../../core/schema-tree/index.js';
import type { SchemaTree } from '../../../core/schema-tree/index.js';

describe('FormulaChangeDetector', () => {
  let baseTree: SchemaTree;
  let currentTree: SchemaTree;
  let index: FormulaDependencyIndex;

  beforeEach(() => {
    const baseRoot = createObjectNode('root', 'root', [
      createNumberNode('price-id', 'price', { defaultValue: 0 }),
      createNumberNode('quantity-id', 'quantity', { defaultValue: 0 }),
      createNumberNode('total-id', 'total', { defaultValue: 0 }),
    ]);
    baseTree = createSchemaTree(baseRoot);

    const baseFormula = new ParsedFormula(baseTree, 'total-id', 'price * quantity');
    baseTree.nodeById('total-id').setFormula(baseFormula);

    const currentRoot = createObjectNode('root', 'root', [
      createNumberNode('price-id', 'cost', { defaultValue: 0 }),
      createNumberNode('quantity-id', 'quantity', { defaultValue: 0 }),
      createNumberNode('total-id', 'total', { defaultValue: 0 }),
    ]);
    currentTree = createSchemaTree(currentRoot);

    const currentFormula = new ParsedFormula(currentTree, 'total-id', 'cost * quantity');
    currentTree.nodeById('total-id').setFormula(currentFormula);

    index = new FormulaDependencyIndex();
    index.registerFormula('total-id', currentFormula);
  });

  it('detects indirect formula change when dependency is renamed', () => {
    const detector = new FormulaChangeDetector(index, currentTree, baseTree);
    const changedNodeIds = new Set(['price-id']);

    const changes = detector.detectIndirectChanges(changedNodeIds);

    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({
      nodeId: 'total-id',
      fromExpression: 'price * quantity',
      toExpression: 'cost * quantity',
    });
  });

  it('returns empty array when changed node has no dependents', () => {
    const baseRoot = createObjectNode('root', 'root', [
      createNumberNode('a-id', 'a', { defaultValue: 0 }),
      createNumberNode('b-id', 'b', { defaultValue: 0 }),
    ]);
    const localBaseTree = createSchemaTree(baseRoot);

    const currentRoot = createObjectNode('root', 'root', [
      createNumberNode('a-id', 'renamed', { defaultValue: 0 }),
      createNumberNode('b-id', 'b', { defaultValue: 0 }),
    ]);
    const localCurrentTree = createSchemaTree(currentRoot);

    const localIndex = new FormulaDependencyIndex();

    const detector = new FormulaChangeDetector(localIndex, localCurrentTree, localBaseTree);
    const changedNodeIds = new Set(['a-id']);

    const changes = detector.detectIndirectChanges(changedNodeIds);

    expect(changes).toHaveLength(0);
  });

  it('skips directly changed nodes', () => {
    const detector = new FormulaChangeDetector(index, currentTree, baseTree);
    const changedNodeIds = new Set(['price-id', 'total-id']);

    const changes = detector.detectIndirectChanges(changedNodeIds);

    expect(changes).toHaveLength(0);
  });

  it('handles no changes', () => {
    const detector = new FormulaChangeDetector(index, currentTree, baseTree);
    const changedNodeIds = new Set<string>();

    const changes = detector.detectIndirectChanges(changedNodeIds);

    expect(changes).toHaveLength(0);
  });
});
