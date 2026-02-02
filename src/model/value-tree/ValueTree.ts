import type { ReactivityAdapter } from '../../core/reactivity/types.js';
import type { AnnotationsMap } from '../../core/types/index.js';
import type { Diagnostic } from '../../core/validation/types.js';
import { parseValuePath } from '../../core/value-path/ValuePathParser.js';
import type { JsonValuePatch } from '../../types/json-value-patch.types.js';
import type { DirtyTrackable, ValueNode } from '../value-node/types.js';
import type { ValueTreeLike } from './types.js';

export class ValueTree implements ValueTreeLike {
  constructor(
    private readonly _root: ValueNode,
    private readonly _reactivity?: ReactivityAdapter,
  ) {
    this.initObservable();
  }

  private initObservable(): void {
    this._reactivity?.makeObservable(this, {
      isDirty: 'computed',
      isValid: 'computed',
      errors: 'computed',
      commit: 'action',
      revert: 'action',
    } as AnnotationsMap<this>);
  }

  get root(): ValueNode {
    return this._root;
  }

  get(path: string): ValueNode | undefined {
    const segments = parseValuePath(path);
    if (segments.length === 0) {
      return this._root;
    }

    let current: ValueNode | undefined = this._root;

    for (const segment of segments) {
      if (!current) {
        return undefined;
      }

      if (segment.isProperty() && current.isObject()) {
        current = current.child(segment.propertyName());
      } else if (segment.isIndex() && current.isArray()) {
        current = current.at(segment.indexValue());
      } else {
        return undefined;
      }
    }

    return current;
  }

  getValue(path: string): unknown {
    const node = this.get(path);
    return node?.getPlainValue();
  }

  setValue(path: string, value: unknown): void {
    const node = this.get(path);
    if (!node) {
      throw new Error(`Path not found: ${path}`);
    }
    if (!node.isPrimitive()) {
      throw new Error(`Cannot set value on non-primitive node: ${path}`);
    }
    node.setValue(value);
  }

  getPlainValue(): unknown {
    return this._root.getPlainValue();
  }

  get isDirty(): boolean {
    const root = this._root as unknown as DirtyTrackable;
    if ('isDirty' in root) {
      return root.isDirty;
    }
    return false;
  }

  get isValid(): boolean {
    return this.errors.length === 0;
  }

  get errors(): readonly Diagnostic[] {
    return this._root.errors;
  }

  getPatches(): readonly JsonValuePatch[] {
    return [];
  }

  commit(): void {
    const root = this._root as unknown as DirtyTrackable;
    if ('commit' in root && typeof root.commit === 'function') {
      root.commit();
    }
  }

  revert(): void {
    const root = this._root as unknown as DirtyTrackable;
    if ('revert' in root && typeof root.revert === 'function') {
      root.revert();
    }
  }
}
