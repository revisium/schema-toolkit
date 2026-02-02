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

      if (this.index.isReplacement(nodeId)) {
        const originalId = this.index.getOriginalNodeId(nodeId);
        if (originalId) {
          const baseNode = this.baseTree.nodeById(originalId);
          changes.push({
            type: 'modified',
            baseNode,
            currentNode,
          });
        }
        continue;
      }

      const basePath = this.index.getBasePath(nodeId);
      if (!basePath) {
        changes.push({
          type: 'added',
          baseNode: null,
          currentNode,
        });
        continue;
      }

      const currentPath = this.currentTree.pathOf(nodeId);
      const baseNode = this.baseTree.nodeById(nodeId);

      if (!basePath.equals(currentPath)) {
        changes.push({
          type: 'moved',
          baseNode,
          currentNode,
        });

        if (!areNodesContentEqual(currentNode, baseNode, this.context)) {
          changes.push({
            type: 'modified',
            baseNode,
            currentNode,
          });
        }
      } else if (!areNodesEqual(currentNode, baseNode, this.context)) {
        changes.push({
          type: 'modified',
          baseNode,
          currentNode,
        });
      }
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
        changes.push({
          type: 'removed',
          baseNode,
          currentNode: null,
        });
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
