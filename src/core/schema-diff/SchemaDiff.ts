import type { SchemaTree } from '../schema-tree/index.js';
import type { RawChange, CoalescedChanges } from './types.js';
import { NodePathIndex } from './NodePathIndex.js';
import { collectChanges } from './ChangeCollector.js';
import { coalesceChanges } from './ChangeCoalescer.js';

export class SchemaDiff {
  private _baseTree: SchemaTree;
  private readonly _currentTree: SchemaTree;
  private _index: NodePathIndex;

  constructor(currentTree: SchemaTree) {
    this._currentTree = currentTree;
    this._baseTree = currentTree.clone();
    this._index = new NodePathIndex(this._baseTree);
  }

  get baseTree(): SchemaTree {
    return this._baseTree;
  }

  get currentTree(): SchemaTree {
    return this._currentTree;
  }

  get index(): NodePathIndex {
    return this._index;
  }

  isDirty(): boolean {
    const changes = this.collectChanges();
    return changes.length > 0;
  }

  collectChanges(): RawChange[] {
    return collectChanges(this._baseTree, this._currentTree, this._index);
  }

  coalesceChanges(changes?: readonly RawChange[]): CoalescedChanges {
    const rawChanges = changes ?? this.collectChanges();
    return coalesceChanges(rawChanges, this._currentTree, this._index);
  }

  trackReplacement(oldNodeId: string, newNodeId: string): void {
    this._index.trackReplacement(oldNodeId, newNodeId);
  }

  markAsSaved(): void {
    this._baseTree = this._currentTree.clone();
    this._index = new NodePathIndex(this._baseTree);
  }
}
