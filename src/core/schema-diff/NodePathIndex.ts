import type { SchemaTree } from '../schema-tree/index.js';
import type { Path } from '../path/index.js';

export class NodePathIndex {
  private readonly _basePaths = new Map<string, Path>();
  private readonly _replacements = new Map<string, string>();

  constructor(baseTree: SchemaTree) {
    for (const nodeId of baseTree.nodeIds()) {
      this._basePaths.set(nodeId, baseTree.pathOf(nodeId));
    }
  }

  hasBasePath(nodeId: string): boolean {
    return this._basePaths.has(nodeId);
  }

  getBasePath(nodeId: string): Path | undefined {
    return this._basePaths.get(nodeId);
  }

  trackReplacement(oldNodeId: string, newNodeId: string): void {
    this._replacements.set(oldNodeId, newNodeId);
  }

  getReplacementNodeId(oldNodeId: string): string | undefined {
    return this._replacements.get(oldNodeId);
  }

  getOriginalNodeId(newNodeId: string): string | undefined {
    for (const [oldId, newId] of this._replacements) {
      if (newId === newNodeId) {
        return oldId;
      }
    }
    return undefined;
  }

  isReplacement(nodeId: string): boolean {
    for (const newId of this._replacements.values()) {
      if (newId === nodeId) {
        return true;
      }
    }
    return false;
  }

  get replacements(): ReadonlyMap<string, string> {
    return this._replacements;
  }
}
