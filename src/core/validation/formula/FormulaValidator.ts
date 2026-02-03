import type { SchemaTree } from '../../schema-tree/index.js';
import type { SchemaNode } from '../../schema-node/index.js';
import type { TreeFormulaValidationError } from './types.js';

export function validateFormulas(tree: SchemaTree): TreeFormulaValidationError[] {
  const errors: TreeFormulaValidationError[] = [];
  collectFormulaErrors(tree.root(), tree, errors, '');
  return errors;
}

function collectFormulaErrors(
  node: SchemaNode,
  tree: SchemaTree,
  errors: TreeFormulaValidationError[],
  fieldPath: string,
): void {
  if (node.isNull()) {
    return;
  }

  validateNodeFormula(node, tree, errors, fieldPath);
  collectChildErrors(node, tree, errors, fieldPath);
}

function validateNodeFormula(
  node: SchemaNode,
  tree: SchemaTree,
  errors: TreeFormulaValidationError[],
  fieldPath: string,
): void {
  if (!node.isPrimitive() || !node.hasFormula()) {
    return;
  }

  const formula = node.formula();
  if (!formula) {
    return;
  }

  for (const dep of formula.dependencies()) {
    const targetNode = tree.nodeById(dep.targetNodeId());
    if (targetNode.isNull()) {
      errors.push({
        nodeId: node.id(),
        message: 'Cannot resolve formula dependency: target node not found',
        fieldPath: fieldPath || node.name(),
      });
    }
  }
}

function collectChildErrors(
  node: SchemaNode,
  tree: SchemaTree,
  errors: TreeFormulaValidationError[],
  fieldPath: string,
): void {
  if (node.isObject()) {
    for (const child of node.properties()) {
      const childPath = buildChildPath(fieldPath, child.name());
      collectFormulaErrors(child, tree, errors, childPath);
    }
  } else if (node.isArray()) {
    const itemsPath = buildArrayItemsPath(fieldPath);
    collectFormulaErrors(node.items(), tree, errors, itemsPath);
  }
}

function buildChildPath(parentPath: string, childName: string): string {
  return parentPath ? `${parentPath}.${childName}` : childName;
}

function buildArrayItemsPath(parentPath: string): string {
  return parentPath ? `${parentPath}[*]` : '[*]';
}
