import type { SchemaTree } from '../schema-tree/index.js';
import type { Path } from '../path/index.js';
import type {
  RawChange,
  CoalescedChanges,
  MovedChange,
  AddedChange,
  RemovedChange,
  ModifiedChange,
} from './types.js';
import { NodePathIndex } from './NodePathIndex.js';

export class ChangeCoalescer {
  constructor(
    private readonly currentTree: SchemaTree,
    private readonly index: NodePathIndex,
  ) {}

  coalesce(changes: readonly RawChange[]): CoalescedChanges {
    const moved: MovedChange[] = [];
    const added: AddedChange[] = [];
    const removed: RemovedChange[] = [];
    const modified: ModifiedChange[] = [];

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
      if (change.type === 'moved') {
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
    const path = this.getChangePath(change);

    if (this.hasParentChange(change, allChanges, path)) {
      return true;
    }

    if (this.isAffectedByMove(change, movedPaths)) {
      return true;
    }

    return false;
  }

  private getChangePath(change: RawChange): Path {
    if (change.type === 'removed') {
      const basePath = this.index.getBasePath(change.baseNode.id());
      if (!basePath) {
        throw new Error(
          `Base path not found for removed node: ${change.baseNode.id()}`,
        );
      }
      return basePath;
    }
    return this.currentTree.pathOf(change.currentNode.id());
  }

  private hasParentChange(
    change: RawChange,
    allChanges: readonly RawChange[],
    path: Path,
  ): boolean {
    for (const other of allChanges) {
      if (other === change) continue;

      if (other.type === 'modified') {
        if (!this.isTypeChangeReplacement(other)) {
          continue;
        }
      }

      if (change.type === 'moved' && other.type === 'added') {
        continue;
      }

      if (change.type === 'moved' && other.type === 'moved') {
        if (this.hasIndependentRename(change)) {
          continue;
        }
      }

      const otherPath = this.getChangePath(other);

      if (path.isChildOf(otherPath)) {
        return true;
      }
    }

    return false;
  }

  private isTypeChangeReplacement(change: ModifiedChange): boolean {
    return change.baseNode.nodeType() !== change.currentNode.nodeType();
  }

  private hasIndependentRename(change: MovedChange): boolean {
    return change.baseNode.name() !== change.currentNode.name();
  }

  private isAffectedByMove(
    change: RawChange,
    movedPaths: Set<string>,
  ): boolean {
    if (change.type !== 'modified') {
      return false;
    }

    const basePath = this.index.getBasePath(change.baseNode.id());
    if (!basePath) {
      return false;
    }

    for (const movedPath of movedPaths) {
      if (
        basePath.asJsonPointer().startsWith(movedPath + '/') &&
        basePath.asJsonPointer() !== movedPath
      ) {
        return true;
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
