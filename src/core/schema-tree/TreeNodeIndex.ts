import type { SchemaNode } from '../schema-node/index.js';
import { NULL_NODE } from '../schema-node/index.js';
import type { Path } from '../path/index.js';
import { EMPTY_PATH } from '../path/index.js';
import { observable, makeObservable } from '../reactivity/index.js';

export class TreeNodeIndex {
  private readonly nodeIndex: Map<string, SchemaNode> = observable.map();
  private readonly pathIndex: Map<string, Path> = observable.map();

  constructor() {
    makeObservable(this, {
      rebuild: 'action',
      nodeCount: 'computed',
    });
  }

  rebuild(rootNode: SchemaNode): void {
    this.nodeIndex.clear();
    this.pathIndex.clear();
    this.collectNodes(rootNode, EMPTY_PATH);
  }

  getNode(id: string): SchemaNode {
    return this.nodeIndex.get(id) ?? NULL_NODE;
  }

  getPath(id: string): Path {
    return this.pathIndex.get(id) ?? EMPTY_PATH;
  }

  get nodeCount(): number {
    return this.nodeIndex.size;
  }

  nodeIds(): IterableIterator<string> {
    return this.nodeIndex.keys();
  }

  private collectNodes(node: SchemaNode, path: Path): void {
    this.nodeIndex.set(node.id(), node);
    this.pathIndex.set(node.id(), path);

    if (node.isObject()) {
      for (const child of node.properties()) {
        this.collectNodes(child, path.child(child.name()));
      }
    } else if (node.isArray()) {
      this.collectNodes(node.items(), path.childItems());
    }
  }
}
