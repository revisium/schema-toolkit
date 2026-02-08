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

  get patches(): readonly JsonValuePatch[] {
    return this.changeTracker.patches;
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
        this.changeTracker.track({
          type: 'setValue',
          path: this.index.pathOf(event.node),
          value: event.value as JsonValue,
          oldValue: event.oldValue as JsonValue,
        });
        break;
      }
      case 'addChild': {
        this.adoptNode(event.child);
        this.changeTracker.track({
          type: 'addProperty',
          path: this.index.pathOf(event.parent).child(event.child.name),
          value: event.child.getPlainValue() as JsonValue,
        });
        break;
      }
      case 'removeChild': {
        this.unsubscribe(event.child);
        this.changeTracker.track({
          type: 'removeProperty',
          path: this.index.pathOf(event.parent).child(event.childName),
        });
        break;
      }
      case 'arrayPush':
      case 'arrayInsert': {
        this.adoptNode(event.item);
        this.index.invalidatePathsUnder(event.array);
        this.changeTracker.track(
          this.toArrayItemChange(event),
        );
        break;
      }
      case 'arrayReplace': {
        this.unsubscribe(event.oldItem);
        this.adoptNode(event.item);
        this.index.invalidatePathsUnder(event.array);
        this.changeTracker.track({
          type: 'arrayReplace',
          path: this.index.pathOf(event.array),
          index: event.index,
          value: event.item.getPlainValue() as JsonValue,
        });
        break;
      }
      case 'arrayRemove': {
        this.unsubscribe(event.item);
        this.index.invalidatePathsUnder(event.array);
        this.changeTracker.track(
          this.toArrayStructureChange(event),
        );
        break;
      }
      case 'arrayMove': {
        this.index.invalidatePathsUnder(event.array);
        this.changeTracker.track(
          this.toArrayStructureChange(event),
        );
        break;
      }
      case 'arrayClear': {
        for (const item of event.items) {
          this.unsubscribe(item);
        }
        this.changeTracker.track({
          type: 'arrayClear',
          path: this.index.pathOf(event.array),
        });
        break;
      }
    }
  }

  private toArrayItemChange(
    event: Extract<NodeChangeEvent, { type: 'arrayPush' | 'arrayInsert' }>,
  ): Change {
    const path = this.index.pathOf(event.array);
    const value = event.item.getPlainValue() as JsonValue;

    if (event.type === 'arrayPush') {
      return { type: 'arrayPush', path, value };
    }
    return { type: 'arrayInsert', path, index: event.index, value };
  }

  private toArrayStructureChange(
    event: Extract<NodeChangeEvent, { type: 'arrayRemove' | 'arrayMove' }>,
  ): Change {
    const path = this.index.pathOf(event.array);

    if (event.type === 'arrayRemove') {
      return { type: 'arrayRemove', path, index: event.index };
    }
    return { type: 'arrayMove', path, fromIndex: event.fromIndex, toIndex: event.toIndex };
  }

  private adoptNode(node: ValueNode): void {
    this.subscribe(node);
    this.index.registerNode(node);
  }

  private walkTree(
    node: ValueNode,
    visit: (n: ValueNode) => void,
  ): void {
    visit(node);

    if (node.isObject()) {
      for (const child of node.children) {
        this.walkTree(child, visit);
      }
    } else if (node.isArray()) {
      for (const item of node.value) {
        this.walkTree(item, visit);
      }
    }
  }

  private subscribe(node: ValueNode): void {
    this.walkTree(node, (n) => n.on('change', this._nodeChangeListener));
  }

  private unsubscribe(node: ValueNode): void {
    this.walkTree(node, (n) => n.off('change', this._nodeChangeListener));
  }
}
