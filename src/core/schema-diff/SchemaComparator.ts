import type { SchemaNode, Formula } from '../schema-node/index.js';
import type { SchemaTree } from '../schema-tree/index.js';
import { FormulaSerializer } from '../schema-formula/serialization/FormulaSerializer.js';

export interface ComparatorContext {
  currentTree: SchemaTree;
  baseTree: SchemaTree;
}

export function areNodesEqual(
  current: SchemaNode,
  base: SchemaNode,
  context: ComparatorContext,
): boolean {
  if (current.name() !== base.name()) {
    return false;
  }

  return areNodesContentEqual(current, base, context);
}

export function areNodesContentEqual(
  current: SchemaNode,
  base: SchemaNode,
  context: ComparatorContext,
): boolean {
  if (current.nodeType() !== base.nodeType()) {
    return false;
  }

  if (!areMetadataEqual(current, base)) {
    return false;
  }

  if (current.isPrimitive()) {
    return arePrimitivesEqual(current, base, context);
  }

  if (current.isRef()) {
    return current.ref() === base.ref();
  }

  if (current.isObject()) {
    return areObjectsEqual(current, base, context);
  }

  if (current.isArray()) {
    return areArraysEqual(current, base, context);
  }

  return current.isNull() && base.isNull();
}

function areMetadataEqual(current: SchemaNode, base: SchemaNode): boolean {
  const metaCurrent = current.metadata();
  const metaBase = base.metadata();

  return (
    metaCurrent.title === metaBase.title &&
    metaCurrent.description === metaBase.description &&
    metaCurrent.deprecated === metaBase.deprecated
  );
}

function arePrimitivesEqual(
  current: SchemaNode,
  base: SchemaNode,
  context: ComparatorContext,
): boolean {
  if (current.defaultValue() !== base.defaultValue()) {
    return false;
  }

  if (current.foreignKey() !== base.foreignKey()) {
    return false;
  }

  if (current.contentMediaType() !== base.contentMediaType()) {
    return false;
  }

  const currentFormula = current.formula();
  const baseFormula = base.formula();

  if (currentFormula === undefined && baseFormula === undefined) {
    return true;
  }

  if (currentFormula === undefined || baseFormula === undefined) {
    return false;
  }

  return areFormulasEqual(
    currentFormula,
    baseFormula,
    current.id(),
    base.id(),
    context,
  );
}

function areFormulasEqual(
  currentFormula: Formula,
  baseFormula: Formula,
  currentNodeId: string,
  baseNodeId: string,
  context: ComparatorContext,
): boolean {
  if (currentFormula.version() !== baseFormula.version()) {
    return false;
  }

  const currentExpr = getSerializedExpression(
    currentFormula,
    context.currentTree,
    currentNodeId,
  );
  const baseExpr = getSerializedExpression(
    baseFormula,
    context.baseTree,
    baseNodeId,
  );

  if (currentExpr === null || baseExpr === null) {
    return false;
  }

  return currentExpr === baseExpr;
}

function getSerializedExpression(
  formula: Formula,
  tree: SchemaTree,
  nodeId: string,
): string | null {
  try {
    return FormulaSerializer.serializeExpression(tree, nodeId, formula, { strict: false });
  } catch {
    return null;
  }
}

function areObjectsEqual(
  current: SchemaNode,
  base: SchemaNode,
  context: ComparatorContext,
): boolean {
  const propsCurrent = current.properties();
  const propsBase = base.properties();

  if (propsCurrent.length !== propsBase.length) {
    return false;
  }

  for (const propCurrent of propsCurrent) {
    const propBase = propsBase.find((p) => p.name() === propCurrent.name());
    if (!propBase || !areNodesEqual(propCurrent, propBase, context)) {
      return false;
    }
  }

  return true;
}

function areArraysEqual(
  current: SchemaNode,
  base: SchemaNode,
  context: ComparatorContext,
): boolean {
  if (current.defaultValue() !== base.defaultValue()) {
    return false;
  }
  return areNodesEqual(current.items(), base.items(), context);
}
