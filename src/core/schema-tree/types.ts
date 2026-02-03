import type { SchemaNode } from '../schema-node/index.js';
import type { Path } from '../path/index.js';

export interface SchemaTree {
  root(): SchemaNode;
  nodeById(id: string): SchemaNode;
  nodeAt(path: Path): SchemaNode;
  pathOf(id: string): Path;
  nodeIds(): IterableIterator<string>;
  countNodes(): number;
  clone(): SchemaTree;
  trackReplacement(oldNodeId: string, newNodeId: string): void;
  replacements(): IterableIterator<[string, string]>;

  addChildTo(parentId: string, node: SchemaNode): void;
  removeNodeAt(path: Path): boolean;
  renameNode(nodeId: string, newName: string): void;
  moveNode(nodeId: string, newParentId: string): void;
  setNodeAt(path: Path, node: SchemaNode): void;
  replaceRoot(newRoot: SchemaNode): void;
}
