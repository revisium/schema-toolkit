import type { ValuePath } from '../../core/value-path/types.js';
import {
  createValuePath,
  EMPTY_VALUE_PATH,
} from '../../core/value-path/ValuePath.js';
import {
  PropertySegment,
  IndexSegment,
} from '../../core/value-path/ValuePathSegment.js';
import type { ValueNode } from '../value-node/types.js';

export class TreeIndex {
  private readonly nodesById = new Map<string, ValueNode>();
  private readonly pathCache = new Map<string, ValuePath>();

  constructor(private readonly root: ValueNode) {
    this.rebuild();
  }

  nodeById(id: string): ValueNode | undefined {
    const node = this.nodesById.get(id);
    if (node) {
      return node;
    }

    this.rebuild();
    return this.nodesById.get(id);
  }

  pathOf(node: ValueNode): ValuePath {
    if (this.isInsideArray(node)) {
      return this.computePath(node);
    }

    const cached = this.pathCache.get(node.id);
    if (cached) {
      return cached;
    }

    const path = this.computePath(node);
    this.pathCache.set(node.id, path);
    return path;
  }

  rebuild(): void {
    this.nodesById.clear();
    this.pathCache.clear();
    this.indexNode(this.root);
  }

  registerNode(node: ValueNode): void {
    this.indexNode(node);
  }

  invalidatePathsUnder(node: ValueNode): void {
    this.pathCache.delete(node.id);
    this.invalidateChildPaths(node);
  }

  private isInsideArray(node: ValueNode): boolean {
    let current: ValueNode | null = node.parent;
    while (current) {
      if (current.isArray()) {
        return true;
      }
      current = current.parent;
    }
    return false;
  }

  private indexNode(node: ValueNode): void {
    this.nodesById.set(node.id, node);

    if (node.isObject()) {
      for (const child of node.children) {
        this.indexNode(child);
      }
    } else if (node.isArray()) {
      for (const item of node.value) {
        this.indexNode(item);
      }
    }
  }

  private computePath(node: ValueNode): ValuePath {
    const segments: Array<PropertySegment | IndexSegment> = [];
    let current: ValueNode | null = node;

    while (current?.parent) {
      const parent: ValueNode = current.parent;

      if (parent.isObject()) {
        segments.unshift(new PropertySegment(current.name));
      } else if (parent.isArray()) {
        const index = parent.value.indexOf(current);
        if (index >= 0) {
          segments.unshift(new IndexSegment(index));
        }
      }

      current = parent;
    }

    if (segments.length === 0) {
      return EMPTY_VALUE_PATH;
    }

    return createValuePath(segments);
  }

  private invalidateChildPaths(node: ValueNode): void {
    if (node.isObject()) {
      for (const child of node.children) {
        this.pathCache.delete(child.id);
        this.invalidateChildPaths(child);
      }
    } else if (node.isArray()) {
      for (const item of node.value) {
        this.pathCache.delete(item.id);
        this.invalidateChildPaths(item);
      }
    }
  }
}
