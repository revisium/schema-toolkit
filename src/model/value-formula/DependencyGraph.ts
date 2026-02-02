import type { PrimitiveValueNode } from '../value-node/index.js';
import type { FormulaField, DependencyMap } from './types.js';

export class DependencyGraph {
  buildDependencyMap(formulas: readonly FormulaField[]): DependencyMap {
    const map: DependencyMap = new Map();

    for (const field of formulas) {
      for (const depNode of field.dependencyNodes) {
        let depSet = map.get(depNode);
        if (!depSet) {
          depSet = new Set();
          map.set(depNode, depSet);
        }
        depSet.add(field);
      }
    }

    return map;
  }

  buildEvaluationOrder(
    formulas: readonly FormulaField[],
  ): readonly FormulaField[] {
    const formulaNodes = new Set(formulas.map((f) => f.node));
    const visited = new Set<PrimitiveValueNode>();
    const order: FormulaField[] = [];

    const formulaByNode = new Map<PrimitiveValueNode, FormulaField>();
    for (const field of formulas) {
      formulaByNode.set(field.node, field);
    }

    const visit = (
      field: FormulaField,
      stack: Set<PrimitiveValueNode>,
    ): void => {
      if (visited.has(field.node)) {
        return;
      }

      if (stack.has(field.node)) {
        return;
      }

      stack.add(field.node);

      for (const depNode of field.dependencyNodes) {
        if (formulaNodes.has(depNode)) {
          const depFormula = formulaByNode.get(depNode);
          if (depFormula) {
            visit(depFormula, stack);
          }
        }
      }

      stack.delete(field.node);
      visited.add(field.node);
      order.push(field);
    };

    for (const field of formulas) {
      visit(field, new Set());
    }

    return order;
  }

  getAffectedFormulas(
    changedNode: PrimitiveValueNode,
    dependencyMap: DependencyMap,
    evaluationOrder: readonly FormulaField[],
  ): readonly FormulaField[] {
    const affected = new Set<FormulaField>();
    const queue: PrimitiveValueNode[] = [changedNode];

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) {
        continue;
      }
      const dependents = dependencyMap.get(current);

      if (dependents) {
        for (const field of dependents) {
          if (!affected.has(field)) {
            affected.add(field);
            queue.push(field.node);
          }
        }
      }
    }

    return evaluationOrder.filter((field) => affected.has(field));
  }
}
