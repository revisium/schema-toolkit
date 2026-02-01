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
}
