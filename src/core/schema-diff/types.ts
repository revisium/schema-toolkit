import type { SchemaNode } from '../schema-node/index.js';

export type ChangeType = 'added' | 'removed' | 'moved' | 'modified';

export interface AddedChange {
  readonly type: 'added';
  readonly baseNode: null;
  readonly currentNode: SchemaNode;
}

export interface RemovedChange {
  readonly type: 'removed';
  readonly baseNode: SchemaNode;
  readonly currentNode: null;
}

export interface MovedChange {
  readonly type: 'moved';
  readonly baseNode: SchemaNode;
  readonly currentNode: SchemaNode;
}

export interface ModifiedChange {
  readonly type: 'modified';
  readonly baseNode: SchemaNode;
  readonly currentNode: SchemaNode;
}

export type RawChange = AddedChange | RemovedChange | MovedChange | ModifiedChange;

export interface CoalescedChanges {
  readonly moved: readonly MovedChange[];
  readonly added: readonly AddedChange[];
  readonly removed: readonly RemovedChange[];
  readonly modified: readonly ModifiedChange[];
}
