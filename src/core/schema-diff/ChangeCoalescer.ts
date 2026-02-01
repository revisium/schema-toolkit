import type { SchemaTree } from '../schema-tree/index.js';
import type { Path } from '../path/index.js';
import type { RawChange, CoalescedChanges } from './types.js';
import { NodePathIndex } from './NodePathIndex.js';

export class ChangeCoalescer {
  constructor(
    private readonly currentTree: SchemaTree,
    private readonly index: NodePathIndex,
  ) {}

  coalesce(changes: readonly RawChange[]): CoalescedChanges {
    const moved: RawChange[] = [];
    const added: RawChange[] = [];
    const removed: RawChange[] = [];
    const modified: RawChange[] = [];

    const movedPaths = this.getMovedPaths(changes);

    for (const change of changes) {
      if (this.isNestedChange(change, changes, movedPaths)) {
        continue;
      }

      switch (change.type) {
        case 'moved':
          moved.push(change);
          break;
        case 'added':
          added.push(change);
          break;
        case 'removed':
          removed.push(change);
          break;
        case 'modified':
          modified.push(change);
          break;
      }
    }

    return { moved, added, removed, modified };
  }

  private getMovedPaths(changes: readonly RawChange[]): Set<string> {
    const paths = new Set<string>();

    for (const change of changes) {
      if (change.type === 'moved' && change.baseNode) {
        const basePath = this.index.getBasePath(change.baseNode.id());
        if (basePath) {
          paths.add(basePath.asJsonPointer());
        }
      }
    }

    return paths;
  }

  private isNestedChange(
    change: RawChange,
    allChanges: readonly RawChange[],
    movedPaths: Set<string>,
  ): boolean {
    const node = change.currentNode ?? change.baseNode;
    if (!node) return false;

    const path = this.getChangePath(change);
    if (!path) return false;

    if (this.hasParentChange(change, allChanges, path)) {
      return true;
    }

    if (this.isAffectedByMove(change, movedPaths)) {
      return true;
    }

    return false;
  }

  private getChangePath(change: RawChange): Path | null {
    if (change.type === 'removed' && change.baseNode) {
      return this.index.getBasePath(change.baseNode.id()) ?? null;
    }

    if (change.currentNode) {
      return this.currentTree.pathOf(change.currentNode.id());
    }

    return null;
  }

  private hasParentChange(
    change: RawChange,
    allChanges: readonly RawChange[],
    path: Path,
  ): boolean {
    for (const other of allChanges) {
      if (other === change) continue;
      if (other.type === 'modified') continue;

      const otherPath = this.getChangePath(other);
      if (!otherPath) continue;

      if (path.isChildOf(otherPath)) {
        return true;
      }
    }

    return false;
  }

  private isAffectedByMove(
    change: RawChange,
    movedPaths: Set<string>,
  ): boolean {
    if (change.type === 'moved') {
      return false;
    }

    if (change.type === 'modified' && change.baseNode) {
      const basePath = this.index.getBasePath(change.baseNode.id());
      if (basePath) {
        for (const movedPath of movedPaths) {
          if (
            basePath.asJsonPointer().startsWith(movedPath + '/') &&
            basePath.asJsonPointer() !== movedPath
          ) {
            return true;
          }
        }
      }
    }

    return false;
  }
}

export function coalesceChanges(
  changes: readonly RawChange[],
  currentTree: SchemaTree,
  index: NodePathIndex,
): CoalescedChanges {
  return new ChangeCoalescer(currentTree, index).coalesce(changes);
}
