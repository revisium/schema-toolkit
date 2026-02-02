import {
  createObjectNode,
  createArrayNode,
  createStringNode,
  createNumberNode,
  createBooleanNode,
  createRefNode,
  NULL_NODE,
} from '../../schema-node/index.js';
import { createSchemaTree } from '../../schema-tree/index.js';
import type { SchemaTree } from '../../schema-tree/index.js';
import type { SchemaNode, NodeMetadata } from '../../schema-node/index.js';
import { SchemaDiff } from '../SchemaDiff.js';
import { createMockFormula } from '../../schema-node/__tests__/test-helpers.js';

let idCounter = 0;

export function resetIdCounter(): void {
  idCounter = 0;
}

function nextId(): string {
  return `node-${++idCounter}`;
}

export function stringNode(
  name: string,
  defaultValue = '',
  metadata: NodeMetadata = {},
): SchemaNode {
  return createStringNode(nextId(), name, { defaultValue, metadata });
}

export function numberNode(
  name: string,
  defaultValue = 0,
  metadata: NodeMetadata = {},
): SchemaNode {
  return createNumberNode(nextId(), name, { defaultValue, metadata });
}

export function booleanNode(
  name: string,
  defaultValue = false,
  metadata: NodeMetadata = {},
): SchemaNode {
  return createBooleanNode(nextId(), name, { defaultValue, metadata });
}

export function objectNode(
  name: string,
  children: SchemaNode[] = [],
  metadata: NodeMetadata = {},
): SchemaNode {
  return createObjectNode(nextId(), name, children, metadata);
}

export function arrayNode(
  name: string,
  items: SchemaNode,
  metadata: NodeMetadata = {},
): SchemaNode {
  return createArrayNode(nextId(), name, items, metadata);
}

export function refNode(name: string, ref: string): SchemaNode {
  return createRefNode(nextId(), name, ref);
}

export function nullNode(): SchemaNode {
  return NULL_NODE;
}

export function stringNodeWithFormula(
  name: string,
  expression: string,
  defaultValue = '',
  version = 1,
): SchemaNode {
  const formula = createMockFormula(version, expression);
  return createStringNode(nextId(), name, { defaultValue, formula });
}

export function numberNodeWithFormula(
  name: string,
  expression: string,
  defaultValue = 0,
  version = 1,
): SchemaNode {
  const formula = createMockFormula(version, expression);
  return createNumberNode(nextId(), name, { defaultValue, formula });
}

export { createMockFormula };

export function createTree(children: SchemaNode[]): SchemaTree {
  const root = createObjectNode(nextId(), 'root', children);
  return createSchemaTree(root);
}

export function createTreeAndDiff(children: SchemaNode[]): {
  tree: SchemaTree;
  diff: SchemaDiff;
} {
  const tree = createTree(children);
  const diff = new SchemaDiff(tree);
  return { tree, diff };
}
