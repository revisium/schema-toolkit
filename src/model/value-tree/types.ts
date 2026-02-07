import type { Diagnostic } from '../../core/validation/types.js';
import type { ValuePath } from '../../core/value-path/types.js';
import type { JsonValue } from '../../types/json.types.js';
import type { JsonValuePatch } from '../../types/json-value-patch.types.js';
import type { ValueNode } from '../value-node/types.js';

interface BaseChange {
  readonly path: ValuePath;
}

export interface SetValueChange extends BaseChange {
  readonly type: 'setValue';
  readonly value: JsonValue;
  readonly oldValue: JsonValue;
}

export interface AddPropertyChange extends BaseChange {
  readonly type: 'addProperty';
  readonly value: JsonValue;
}

export interface RemovePropertyChange extends BaseChange {
  readonly type: 'removeProperty';
}

export interface ArrayPushChange extends BaseChange {
  readonly type: 'arrayPush';
  readonly value: JsonValue;
}

export interface ArrayInsertChange extends BaseChange {
  readonly type: 'arrayInsert';
  readonly index: number;
  readonly value: JsonValue;
}

export interface ArrayRemoveChange extends BaseChange {
  readonly type: 'arrayRemove';
  readonly index: number;
}

export interface ArrayMoveChange extends BaseChange {
  readonly type: 'arrayMove';
  readonly fromIndex: number;
  readonly toIndex: number;
}

export interface ArrayReplaceChange extends BaseChange {
  readonly type: 'arrayReplace';
  readonly index: number;
  readonly value: JsonValue;
}

export interface ArrayClearChange extends BaseChange {
  readonly type: 'arrayClear';
}

export type Change =
  | SetValueChange
  | AddPropertyChange
  | RemovePropertyChange
  | ArrayPushChange
  | ArrayInsertChange
  | ArrayRemoveChange
  | ArrayMoveChange
  | ArrayReplaceChange
  | ArrayClearChange;

export type ChangeType = Change['type'];

export interface ValueTreeLike {
  readonly root: ValueNode;
  get(path: string): ValueNode | undefined;
  getValue(path: string): unknown;
  setValue(path: string, value: unknown): void;
  getPlainValue(): unknown;
  readonly isDirty: boolean;
  readonly isValid: boolean;
  readonly errors: readonly Diagnostic[];
  getPatches(): readonly JsonValuePatch[];
  commit(): void;
  revert(): void;
  nodeById(id: string): ValueNode | undefined;
  pathOf(nodeOrId: ValueNode | string): ValuePath;
  dispose(): void;
}
