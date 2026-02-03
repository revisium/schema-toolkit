import type { Diagnostic } from '../../core/validation/types.js';
import type { JsonValuePatch } from '../../types/json-value-patch.types.js';
import type { ValueNode } from '../value-node/types.js';

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
}
