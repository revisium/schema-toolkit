import type { SchemaNode } from '../schema-node/index.js';
import { NULL_NODE } from '../schema-node/index.js';
import type { Path } from '../path/index.js';
import type { SchemaTree } from './types.js';
import { TreeNodeIndex } from './TreeNodeIndex.js';

export class SchemaTreeImpl implements SchemaTree {
  private readonly index = new TreeNodeIndex();
  private readonly _replacements = new Map<string, string>();

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
    const cloned = new SchemaTreeImpl(this.rootNode.clone());
    for (const [oldId, newId] of this._replacements) {
      cloned._replacements.set(oldId, newId);
    }
    return cloned;
  }

  trackReplacement(oldNodeId: string, newNodeId: string): void {
    this._replacements.set(oldNodeId, newNodeId);
  }

  replacements(): IterableIterator<[string, string]> {
    return this._replacements.entries();
  }

  addChildTo(parentId: string, node: SchemaNode): void {
    const parent = this.nodeById(parentId);
    if (parent.isNull()) {
      return;
    }

    parent.addChild(node);
    this.rebuildIndex();
  }

  removeNodeAt(path: Path): boolean {
    if (path.isEmpty()) {
      return false;
    }

    const parentPath = path.parent();
    const parent = this.nodeAt(parentPath);

    if (parent.isNull()) {
      return false;
    }

    const segments = path.segments();
    const lastSegment = segments[segments.length - 1];

    if (!lastSegment || lastSegment.isItems()) {
      return false;
    }

    const removed = parent.removeChild(lastSegment.propertyName());
    if (removed) {
      this.rebuildIndex();
    }
    return removed;
  }

  renameNode(nodeId: string, newName: string): void {
    const node = this.nodeById(nodeId);
    if (node.isNull()) {
      return;
    }

    node.setName(newName);
    this.rebuildIndex();
  }

  moveNode(nodeId: string, newParentId: string): void {
    const node = this.nodeById(nodeId);
    if (node.isNull()) {
      return;
    }

    const currentPath = this.pathOf(nodeId);
    if (currentPath.isEmpty()) {
      return;
    }

    const currentParentPath = currentPath.parent();
    const currentParent = this.nodeAt(currentParentPath);

    if (currentParent.isNull()) {
      return;
    }

    const newParent = this.nodeById(newParentId);
    if (newParent.isNull()) {
      return;
    }

    currentParent.removeChild(node.name());
    newParent.addChild(node);
    this.rebuildIndex();
  }

  setNodeAt(path: Path, node: SchemaNode): void {
    if (path.isEmpty()) {
      return;
    }

    const parentPath = path.parent();
    const parent = this.nodeAt(parentPath);

    if (parent.isNull()) {
      return;
    }

    const segments = path.segments();
    const lastSegment = segments[segments.length - 1];

    if (!lastSegment) {
      return;
    }

    if (lastSegment.isItems()) {
      parent.setItems(node);
    } else {
      parent.removeChild(lastSegment.propertyName());
      node.setName(lastSegment.propertyName());
      parent.addChild(node);
    }

    this.rebuildIndex();
  }

  private rebuildIndex(): void {
    this.index.rebuild(this.rootNode);
  }
}

export function createSchemaTree(root: SchemaNode): SchemaTree {
  return new SchemaTreeImpl(root);
}
