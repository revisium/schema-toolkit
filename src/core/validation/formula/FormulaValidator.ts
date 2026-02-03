import type { SchemaTree } from '../../schema-tree/index.js';
import type { SchemaNode } from '../../schema-node/index.js';
import type { FormulaValidationError } from './types.js';

export function validateFormulas(tree: SchemaTree): FormulaValidationError[] {
  const errors: FormulaValidationError[] = [];
  collectFormulaErrors(tree.root(), tree, errors, '');
  return errors;
}

function collectFormulaErrors(
  node: SchemaNode,
  tree: SchemaTree,
  errors: FormulaValidationError[],
  fieldPath: string,
): void {
  if (node.isNull()) {
    return;
  }

  if (node.isPrimitive() && node.hasFormula()) {
    const formula = node.formula();
    if (formula) {
      for (const dep of formula.dependencies()) {
        const targetId = dep.targetNodeId();
        const targetNode = tree.nodeById(targetId);
        if (targetNode.isNull()) {
          errors.push({
            nodeId: node.id(),
            message: 'Cannot resolve formula dependency: target node not found',
            fieldPath: fieldPath || node.name(),
          });
        }
      }
    }
  }

  if (node.isObject()) {
    for (const child of node.properties()) {
      const childPath = fieldPath ? `${fieldPath}.${child.name()}` : child.name();
      collectFormulaErrors(child, tree, errors, childPath);
    }
  } else if (node.isArray()) {
    const itemsPath = fieldPath ? `${fieldPath}[*]` : '[*]';
    collectFormulaErrors(node.items(), tree, errors, itemsPath);
  }
}
