import type { SchemaNode } from '../schema-node/index.js';

export function areNodesEqual(a: SchemaNode, b: SchemaNode): boolean {
  if (a.nodeType() !== b.nodeType()) {
    return false;
  }

  if (a.name() !== b.name()) {
    return false;
  }

  if (!areMetadataEqual(a, b)) {
    return false;
  }

  if (a.isPrimitive()) {
    return arePrimitivesEqual(a, b);
  }

  if (a.isObject()) {
    return areObjectsEqual(a, b);
  }

  if (a.isArray()) {
    return areArraysEqual(a, b);
  }

  if (a.isRef()) {
    return a.ref() === b.ref();
  }

  return a.isNull() && b.isNull();
}

function areMetadataEqual(a: SchemaNode, b: SchemaNode): boolean {
  const metaA = a.metadata();
  const metaB = b.metadata();

  return (
    metaA.title === metaB.title &&
    metaA.description === metaB.description &&
    metaA.deprecated === metaB.deprecated
  );
}

function arePrimitivesEqual(a: SchemaNode, b: SchemaNode): boolean {
  if (a.defaultValue() !== b.defaultValue()) {
    return false;
  }

  const formulaA = a.formula();
  const formulaB = b.formula();

  if (formulaA === undefined && formulaB === undefined) {
    return a.foreignKey() === b.foreignKey();
  }

  if (formulaA === undefined || formulaB === undefined) {
    return false;
  }

  return (
    formulaA.expression === formulaB.expression &&
    a.foreignKey() === b.foreignKey()
  );
}

function areObjectsEqual(a: SchemaNode, b: SchemaNode): boolean {
  const propsA = a.properties();
  const propsB = b.properties();

  if (propsA.length !== propsB.length) {
    return false;
  }

  for (const propA of propsA) {
    const propB = propsB.find((p) => p.name() === propA.name());
    if (!propB || !areNodesEqual(propA, propB)) {
      return false;
    }
  }

  return true;
}

function areArraysEqual(a: SchemaNode, b: SchemaNode): boolean {
  return areNodesEqual(a.items(), b.items());
}
