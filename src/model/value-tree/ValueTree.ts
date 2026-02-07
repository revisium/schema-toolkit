import { makeAutoObservable } from '../../core/reactivity/index.js';
import type { Diagnostic } from '../../core/validation/types.js';
import type { ValuePath } from '../../core/value-path/types.js';
import { EMPTY_VALUE_PATH } from '../../core/value-path/ValuePath.js';
import { parseValuePath } from '../../core/value-path/ValuePathParser.js';
import type { JsonValue } from '../../types/json.types.js';
import type { JsonValuePatch } from '../../types/json-value-patch.types.js';
import type { DirtyTrackable, ValueNode } from '../value-node/types.js';
import type { FormulaEngine } from '../value-formula/FormulaEngine.js';
import { ChangeTracker } from './ChangeTracker.js';
import { TreeIndex } from './TreeIndex.js';
import type { Change, ValueTreeLike } from './types.js';

export class ValueTree implements ValueTreeLike {
  private readonly index: TreeIndex;
  private readonly changeTracker: ChangeTracker;
  private _formulaEngine: FormulaEngine | null = null;

  constructor(private readonly _root: ValueNode) {
    this.index = new TreeIndex(_root);
    this.changeTracker = new ChangeTracker();

    makeAutoObservable(this, {
      _root: false,
      index: false,
      changeTracker: false,
      _formulaEngine: false,
    });
  }

  get root(): ValueNode {
    return this._root;
  }

  nodeById(id: string): ValueNode | undefined {
    return this.index.nodeById(id);
  }

  pathOf(nodeOrId: ValueNode | string): ValuePath {
    const node =
      typeof nodeOrId === 'string' ? this.index.nodeById(nodeOrId) : nodeOrId;
    if (!node) {
      return EMPTY_VALUE_PATH;
    }
    return this.index.pathOf(node);
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

    const oldValue = node.value as JsonValue;
    node.setValue(value);

    this.changeTracker.track({
      type: 'setValue',
      path: this.index.pathOf(node),
      value: value as JsonValue,
      oldValue,
    });
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
    return this.changeTracker.toPatches();
  }

  trackChange(change: Change): void {
    this.changeTracker.track(change);
  }

  commit(): void {
    const root = this._root as unknown as DirtyTrackable;
    if ('commit' in root && typeof root.commit === 'function') {
      root.commit();
    }
    this.changeTracker.clear();
  }

  revert(): void {
    const root = this._root as unknown as DirtyTrackable;
    if ('revert' in root && typeof root.revert === 'function') {
      root.revert();
    }
    this.changeTracker.clear();
  }

  rebuildIndex(): void {
    this.index.rebuild();
  }

  registerNode(node: ValueNode): void {
    this.index.registerNode(node);
  }

  invalidatePathsUnder(node: ValueNode): void {
    this.index.invalidatePathsUnder(node);
  }

  setFormulaEngine(engine: FormulaEngine): void {
    this._formulaEngine = engine;
  }

  get formulaEngine(): FormulaEngine | null {
    return this._formulaEngine;
  }

  dispose(): void {
    this._formulaEngine?.dispose();
    this._formulaEngine = null;
  }
}
