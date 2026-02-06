import { PatchBuilder } from '../PatchBuilder.js';
import { createSchemaTree } from '../../schema-tree/index.js';
import type { SchemaTree } from '../../schema-tree/index.js';
import type { SchemaNode, Formula, NodeMetadata } from '../../schema-node/index.js';
import {
  createObjectNode,
  createStringNode,
  createNumberNode,
  createArrayNode,
  createBooleanNode,
  createRefNode,
} from '../../schema-node/index.js';
import type {
  CoalescedChanges,
  AddedChange,
  RemovedChange,
  MovedChange,
  ModifiedChange,
} from '../../schema-diff/index.js';
import type { ContentMediaType } from '../../../types/index.js';
import { createMockFormula } from '../../schema-node/__tests__/test-helpers.js';

export { createMockFormula };

export const builder = new PatchBuilder();

export {
  createSchemaTree,
  createObjectNode,
  createStringNode,
  createNumberNode,
  createArrayNode,
  createBooleanNode,
  createRefNode,
};

export type { SchemaTree, SchemaNode };

interface PrimitiveNodeOptions {
  id?: string;
  default?: string | number | boolean;
  formula?: Formula;
  foreignKey?: string;
  description?: string;
  deprecated?: boolean;
  contentMediaType?: ContentMediaType;
}

interface ObjectNodeOptions {
  id?: string;
  description?: string;
  deprecated?: boolean;
}

interface ArrayNodeOptions {
  id?: string;
  description?: string;
  deprecated?: boolean;
}

interface RefNodeOptions {
  id?: string;
  description?: string;
  deprecated?: boolean;
}

const buildMetadata = (opts?: {
  description?: string;
  deprecated?: boolean;
}): NodeMetadata | undefined => {
  if (!opts?.description && !opts?.deprecated) {
    return undefined;
  }
  return { description: opts.description, deprecated: opts.deprecated };
};

export const str = (
  name: string,
  opts?: PrimitiveNodeOptions,
): SchemaNode => {
  return createStringNode(opts?.id ?? name, name, {
    defaultValue: opts?.default as string | undefined,
    formula: opts?.formula,
    foreignKey: opts?.foreignKey,
    metadata: buildMetadata(opts),
    contentMediaType: opts?.contentMediaType,
  });
};

export const num = (
  name: string,
  opts?: PrimitiveNodeOptions,
): SchemaNode => {
  return createNumberNode(opts?.id ?? name, name, {
    defaultValue: opts?.default as number | undefined,
    formula: opts?.formula,
    metadata: buildMetadata(opts),
  });
};

export const bool = (
  name: string,
  opts?: PrimitiveNodeOptions,
): SchemaNode => {
  return createBooleanNode(opts?.id ?? name, name, {
    defaultValue: opts?.default as boolean | undefined,
    metadata: buildMetadata(opts),
  });
};

export const obj = (
  name: string,
  children: SchemaNode[],
  opts?: ObjectNodeOptions,
): SchemaNode => {
  return createObjectNode(
    opts?.id ?? name,
    name,
    children,
    buildMetadata(opts),
  );
};

export const arr = (
  name: string,
  items: SchemaNode,
  opts?: ArrayNodeOptions,
): SchemaNode => {
  return createArrayNode(
    opts?.id ?? name,
    name,
    items,
    buildMetadata(opts),
  );
};

export const ref = (
  name: string,
  refValue: string,
  opts?: RefNodeOptions,
): SchemaNode => {
  return createRefNode(
    opts?.id ?? name,
    name,
    refValue,
    buildMetadata(opts),
  );
};

export const objRoot = (
  children: SchemaNode[],
  opts?: { description?: string; deprecated?: boolean },
): SchemaNode => {
  return createObjectNode('root', 'root', children, buildMetadata(opts));
};

export const arrRoot = (
  items: SchemaNode,
  opts?: { description?: string; deprecated?: boolean },
): SchemaNode => {
  return createArrayNode('root', 'root', items, buildMetadata(opts));
};

export const strRoot = (
  opts?: PrimitiveNodeOptions,
): SchemaNode => {
  return createStringNode('root', 'root', {
    defaultValue: opts?.default as string | undefined,
    formula: opts?.formula,
    foreignKey: opts?.foreignKey,
    metadata: buildMetadata(opts),
    contentMediaType: opts?.contentMediaType,
  });
};

export const numRoot = (
  opts?: PrimitiveNodeOptions,
): SchemaNode => {
  return createNumberNode('root', 'root', {
    defaultValue: opts?.default as number | undefined,
    formula: opts?.formula,
    metadata: buildMetadata(opts),
  });
};

export const boolRoot = (
  opts?: PrimitiveNodeOptions,
): SchemaNode => {
  return createBooleanNode('root', 'root', {
    defaultValue: opts?.default as boolean | undefined,
    metadata: buildMetadata(opts),
  });
};

export interface TreePair {
  base: SchemaTree;
  current: SchemaTree;
}

export const treePair = (
  baseRoot: SchemaNode,
  currentRoot: SchemaNode,
): TreePair => ({
  base: createSchemaTree(baseRoot),
  current: createSchemaTree(currentRoot),
});

type MaybeNode = SchemaNode | undefined;

interface ChangesInput {
  added?: MaybeNode[];
  removed?: MaybeNode[];
  moved?: Array<[MaybeNode, MaybeNode]>;
  modified?: Array<[MaybeNode, MaybeNode]>;
}

export const changes = (input: ChangesInput = {}): CoalescedChanges => {
  const added: AddedChange[] = (input.added ?? [])
    .filter((n): n is SchemaNode => n !== undefined)
    .map((n) => ({
      type: 'added' as const,
      baseNode: null,
      currentNode: n,
    }));

  const removed: RemovedChange[] = (input.removed ?? [])
    .filter((n): n is SchemaNode => n !== undefined)
    .map((n) => ({
      type: 'removed' as const,
      baseNode: n,
      currentNode: null,
    }));

  const moved: MovedChange[] = (input.moved ?? [])
    .filter((pair): pair is [SchemaNode, SchemaNode] =>
      pair[0] !== undefined && pair[1] !== undefined)
    .map(([b, c]) => ({
      type: 'moved' as const,
      baseNode: b,
      currentNode: c,
    }));

  const modified: ModifiedChange[] = (input.modified ?? [])
    .filter((pair): pair is [SchemaNode, SchemaNode] =>
      pair[0] !== undefined && pair[1] !== undefined)
    .map(([b, c]) => ({
      type: 'modified' as const,
      baseNode: b,
      currentNode: c,
    }));

  return { added, removed, moved, modified };
};
