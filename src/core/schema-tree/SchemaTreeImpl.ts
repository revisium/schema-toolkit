import type { SchemaNode } from '../schema-node/index.js';
import { NULL_NODE } from '../schema-node/index.js';
import type { Path } from '../path/index.js';
import type { SchemaTree } from './types.js';
import { TreeNodeIndex } from './TreeNodeIndex.js';

export class SchemaTreeImpl implements SchemaTree {
  private readonly index = new TreeNodeIndex();

  constructor(private readonly rootNode: SchemaNode) {
    this.index.rebuild(rootNode);
  }

  root(): SchemaNode {
    return this.rootNode;
  }

  nodeById(id: string): SchemaNode {
    return this.index.getNode(id);
  }

  pathOf(id: string): Path {
    return this.index.getPath(id);
  }

  nodeAt(path: Path): SchemaNode {
    if (path.isEmpty()) {
      return this.rootNode;
    }

    let current: SchemaNode = this.rootNode;

    for (const segment of path.segments()) {
      if (current.isNull()) {
        return NULL_NODE;
      }

      if (segment.isItems()) {
        current = current.items();
      } else {
        current = current.property(segment.propertyName());
      }
    }

    return current;
  }

  nodeIds(): IterableIterator<string> {
    return this.index.nodeIds();
  }

  countNodes(): number {
    return this.index.countNodes();
  }

  clone(): SchemaTree {
    return new SchemaTreeImpl(this.rootNode.clone());
  }
}

export function createSchemaTree(root: SchemaNode): SchemaTree {
  return new SchemaTreeImpl(root);
}
