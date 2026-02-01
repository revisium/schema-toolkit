import type { SchemaNode } from '../schema-node/index.js';

export type ChangeType = 'added' | 'removed' | 'moved' | 'modified';

export interface RawChange {
  readonly type: ChangeType;
  readonly baseNode: SchemaNode | null;
  readonly currentNode: SchemaNode | null;
}

export interface CoalescedChanges {
  readonly moved: readonly RawChange[];
  readonly added: readonly RawChange[];
  readonly removed: readonly RawChange[];
  readonly modified: readonly RawChange[];
}
