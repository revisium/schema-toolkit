import type { SchemaNode } from '../schema-node/index.js';
import type { SchemaTree } from '../schema-tree/index.js';
import type { RawChange } from './types.js';
import { NodePathIndex } from './NodePathIndex.js';
import {
  areNodesEqual,
  areNodesContentEqual,
  type ComparatorContext,
} from './SchemaComparator.js';

export class ChangeCollector {
  private readonly context: ComparatorContext;

  constructor(
    private readonly baseTree: SchemaTree,
    private readonly currentTree: SchemaTree,
    private readonly index: NodePathIndex,
  ) {
    this.context = { currentTree, baseTree };
  }

  collect(): RawChange[] {
    const changes: RawChange[] = [];

    this.collectFromCurrentTree(changes);
    this.collectRemovedNodes(changes);

    return changes;
  }

  private collectFromCurrentTree(changes: RawChange[]): void {
    for (const nodeId of this.currentTree.nodeIds()) {
      const currentNode = this.currentTree.nodeById(nodeId);
      this.collectNodeChange(changes, nodeId, currentNode);
    }
  }

  private collectNodeChange(
    changes: RawChange[],
    nodeId: string,
    currentNode: SchemaNode,
  ): void {
    if (this.index.isReplacement(nodeId)) {
      this.collectReplacementChange(changes, nodeId, currentNode);
      return;
    }

    const basePath = this.index.getBasePath(nodeId);
    if (!basePath) {
      changes.push({ type: 'added', baseNode: null, currentNode });
      return;
    }

    const currentPath = this.currentTree.pathOf(nodeId);
    const baseNode = this.baseTree.nodeById(nodeId);

    if (!basePath.equals(currentPath)) {
      this.collectMovedChange(changes, baseNode, currentNode);
    } else if (!areNodesEqual(currentNode, baseNode, this.context)) {
      changes.push({ type: 'modified', baseNode, currentNode });
    }
  }

  private collectReplacementChange(
    changes: RawChange[],
    nodeId: string,
    currentNode: SchemaNode,
  ): void {
    const originalId = this.index.getOriginalNodeId(nodeId);
    if (!originalId) {
      return;
    }

    const baseNode = this.baseTree.nodeById(originalId);
    if (baseNode.isNull()) {
      changes.push({ type: 'added', baseNode: null, currentNode });
    } else {
      changes.push({ type: 'modified', baseNode, currentNode });
    }
  }

  private collectMovedChange(
    changes: RawChange[],
    baseNode: SchemaNode,
    currentNode: SchemaNode,
  ): void {
    changes.push({ type: 'moved', baseNode, currentNode });

    if (!areNodesContentEqual(currentNode, baseNode, this.context)) {
      changes.push({ type: 'modified', baseNode, currentNode });
    }
  }

  private collectRemovedNodes(changes: RawChange[]): void {
    for (const nodeId of this.baseTree.nodeIds()) {
      if (this.index.getReplacementNodeId(nodeId)) {
        continue;
      }

      const currentNode = this.currentTree.nodeById(nodeId);
      if (currentNode.isNull()) {
        const baseNode = this.baseTree.nodeById(nodeId);
        changes.push({ type: 'removed', baseNode, currentNode: null });
      }
    }
  }
}

export function collectChanges(
  baseTree: SchemaTree,
  currentTree: SchemaTree,
  index: NodePathIndex,
): RawChange[] {
  return new ChangeCollector(baseTree, currentTree, index).collect();
}
