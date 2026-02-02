import type { SchemaTree } from '../../../core/schema-tree/index.js';
import type { FormulaDependencyIndex } from '../store/FormulaDependencyIndex.js';
import type { Formula } from '../core/Formula.js';
import { FormulaSerializer } from '../serialization/FormulaSerializer.js';

export interface IndirectFormulaChange {
  readonly nodeId: string;
  readonly fromExpression: string;
  readonly toExpression: string;
}

export class FormulaChangeDetector {
  constructor(
    private readonly index: FormulaDependencyIndex,
    private readonly currentTree: SchemaTree,
    private readonly baseTree: SchemaTree,
  ) {}

  detectIndirectChanges(changedNodeIds: Set<string>): IndirectFormulaChange[] {
    const result: IndirectFormulaChange[] = [];
    const visited = new Set<string>();

    for (const changedId of changedNodeIds) {
      this.collectDependentChanges(changedId, result, visited, changedNodeIds);
    }

    return result;
  }

  private collectDependentChanges(
    nodeId: string,
    result: IndirectFormulaChange[],
    visited: Set<string>,
    directlyChanged: Set<string>,
  ): void {
    const dependents = this.index.getDependents(nodeId);

    for (const dependentId of dependents) {
      if (visited.has(dependentId)) {
        continue;
      }
      visited.add(dependentId);

      if (directlyChanged.has(dependentId)) {
        continue;
      }

      const change = this.detectFormulaChange(dependentId);
      if (change) {
        result.push(change);
      }

      this.collectDependentChanges(dependentId, result, visited, directlyChanged);
    }
  }

  private detectFormulaChange(nodeId: string): IndirectFormulaChange | null {
    const currentNode = this.currentTree.nodeById(nodeId);
    const baseNode = this.baseTree.nodeById(nodeId);

    if (currentNode.isNull() || baseNode.isNull()) {
      return null;
    }

    const currentFormula = currentNode.formula();
    const baseFormula = baseNode.formula();

    if (!currentFormula || !baseFormula) {
      return null;
    }

    const fromExpression = this.getSerializedExpression(baseFormula, this.baseTree, nodeId);
    const toExpression = this.getSerializedExpression(currentFormula, this.currentTree, nodeId);

    if (fromExpression === null || toExpression === null) {
      return null;
    }

    if (fromExpression === toExpression) {
      return null;
    }

    return {
      nodeId,
      fromExpression,
      toExpression,
    };
  }

  private getSerializedExpression(
    formula: Formula,
    tree: SchemaTree,
    nodeId: string,
  ): string | null {
    try {
      const xFormula = FormulaSerializer.toXFormula(tree, nodeId, formula);
      return xFormula.expression;
    } catch {
      return null;
    }
  }
}
