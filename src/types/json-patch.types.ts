import { JsonSchema } from './schema.types.js';

export type JsonPatchMoveOperation = 'move';
export type JsonPatchReplaceOperation = 'replace';
export type JsonPatchRemoveOperation = 'remove';
export type JsonPatchAddOperation = 'add';

export type JsonPatchMove = {
  op: JsonPatchMoveOperation;
  from: string;
  path: string;
};
export type JsonPatchReplace = {
  op: JsonPatchReplaceOperation;
  path: string;
  value: JsonSchema;
};
export type JsonPatchRemove = { op: JsonPatchRemoveOperation; path: string };
export type JsonPatchAdd = {
  op: JsonPatchAddOperation;
  path: string;
  value: JsonSchema;
};

export type JsonPatch =
  | JsonPatchMove
  | JsonPatchReplace
  | JsonPatchRemove
  | JsonPatchAdd;
