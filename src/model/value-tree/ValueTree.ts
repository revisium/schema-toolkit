import { makeAutoObservable } from '../../core/reactivity/index.js';
import type { Diagnostic } from '../../core/validation/types.js';
import type { ValuePath } from '../../core/value-path/types.js';
import { EMPTY_VALUE_PATH } from '../../core/value-path/ValuePath.js';
import { parseValuePath } from '../../core/value-path/ValuePathParser.js';
import type { JsonValue } from '../../types/json.types.js';
import type { JsonValuePatch } from '../../types/json-value-patch.types.js';
import type {
  DirtyTrackable,
  NodeChangeEvent,
  ValueNode,
} from '../value-node/types.js';
import type { FormulaEngine } from '../value-formula/FormulaEngine.js';
import { ChangeTracker } from './ChangeTracker.js';
import { TreeIndex } from './TreeIndex.js';
import type { Change, ValueTreeLike } from './types.js';

export class ValueTree implements ValueTreeLike {
  private readonly index: TreeIndex;
  private readonly changeTracker: ChangeTracker;
  private readonly _nodeChangeListener: (event: NodeChangeEvent) => void;
  private _formulaEngine: FormulaEngine | null = null;
  private _suppressEvents = false;

  constructor(private readonly _root: ValueNode) {
    this.index = new TreeIndex(_root);
    this.changeTracker = new ChangeTracker();
    this._nodeChangeListener = (event: NodeChangeEvent) =>
      this.handleNodeChange(event);
    this.subscribe(this._root);

    makeAutoObservable(this, {
      _root: false,
      index: false,
      changeTracker: false,
      _nodeChangeListener: false,
      _formulaEngine: false,
      _suppressEvents: false,
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

  setValue(path: string, value: unknown, options?: { internal?: boolean }): void {
    const node = this.get(path);
    if (!node) {
      throw new Error(`Path not found: ${path}`);
    }

    const oldValue = node.getPlainValue() as JsonValue;

    this._suppressEvents = true;
    try {
      if (node.isPrimitive()) {
        node.setValue(value, options);
      } else if (node.isObject()) {
        node.setValue(value as Record<string, unknown>, options);
      } else if (node.isArray()) {
        node.setValue(value as unknown[], options);
      }
    } finally {
      this._suppressEvents = false;
    }

    this.changeTracker.track({
      type: 'setValue',
      path: this.index.pathOf(node),
      value: node.getPlainValue() as JsonValue,
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
    this.unsubscribe(this._root);
    const root = this._root as unknown as DirtyTrackable;
    if ('revert' in root && typeof root.revert === 'function') {
      root.revert();
    }
    this.changeTracker.clear();
    this.subscribe(this._root);
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
    this.unsubscribe(this._root);
    this._formulaEngine?.dispose();
    this._formulaEngine = null;
  }

  private handleNodeChange(event: NodeChangeEvent): void {
    if (this._suppressEvents) {
      return;
    }

    switch (event.type) {
      case 'setValue': {
        const path = this.index.pathOf(event.node);
        this.changeTracker.track({
          type: 'setValue',
          path,
          value: event.value as JsonValue,
          oldValue: event.oldValue as JsonValue,
        });
        break;
      }
      case 'addChild': {
        const path = this.index.pathOf(event.parent);
        this.subscribe(event.child);
        this.index.registerNode(event.child);
        this.changeTracker.track({
          type: 'addProperty',
          path: path.child(event.child.name),
          value: event.child.getPlainValue() as JsonValue,
        });
        break;
      }
      case 'removeChild': {
        const path = this.index.pathOf(event.parent);
        this.changeTracker.track({
          type: 'removeProperty',
          path: path.child(event.childName),
        });
        break;
      }
      case 'arrayPush': {
        const path = this.index.pathOf(event.array);
        this.subscribe(event.item);
        this.index.registerNode(event.item);
        this.index.invalidatePathsUnder(event.array);
        this.changeTracker.track({
          type: 'arrayPush',
          path,
          value: event.item.getPlainValue() as JsonValue,
        });
        break;
      }
      case 'arrayInsert': {
        const path = this.index.pathOf(event.array);
        this.subscribe(event.item);
        this.index.registerNode(event.item);
        this.index.invalidatePathsUnder(event.array);
        this.changeTracker.track({
          type: 'arrayInsert',
          path,
          index: event.index,
          value: event.item.getPlainValue() as JsonValue,
        });
        break;
      }
      case 'arrayRemove': {
        const path = this.index.pathOf(event.array);
        this.index.invalidatePathsUnder(event.array);
        this.changeTracker.track({
          type: 'arrayRemove',
          path,
          index: event.index,
        });
        break;
      }
      case 'arrayMove': {
        const path = this.index.pathOf(event.array);
        this.index.invalidatePathsUnder(event.array);
        this.changeTracker.track({
          type: 'arrayMove',
          path,
          fromIndex: event.fromIndex,
          toIndex: event.toIndex,
        });
        break;
      }
      case 'arrayReplace': {
        const path = this.index.pathOf(event.array);
        this.subscribe(event.item);
        this.index.registerNode(event.item);
        this.index.invalidatePathsUnder(event.array);
        this.changeTracker.track({
          type: 'arrayReplace',
          path,
          index: event.index,
          value: event.item.getPlainValue() as JsonValue,
        });
        break;
      }
      case 'arrayClear': {
        const path = this.index.pathOf(event.array);
        this.changeTracker.track({
          type: 'arrayClear',
          path,
        });
        break;
      }
    }
  }

  private subscribe(node: ValueNode): void {
    node.on('change', this._nodeChangeListener);

    if (node.isObject()) {
      for (const child of node.children) {
        this.subscribe(child);
      }
    } else if (node.isArray()) {
      for (const item of node.value) {
        this.subscribe(item);
      }
    }
  }

  private unsubscribe(node: ValueNode): void {
    node.off('change', this._nodeChangeListener);

    if (node.isObject()) {
      for (const child of node.children) {
        this.unsubscribe(child);
      }
    } else if (node.isArray()) {
      for (const item of node.value) {
        this.unsubscribe(item);
      }
    }
  }
}
