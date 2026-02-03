import { makeObservable, observable } from '../../core/reactivity/index.js';
import type { Diagnostic } from '../../core/validation/types.js';
import type { JsonSchema } from '../../types/schema.types.js';
import { BaseValueNode } from './BaseValueNode.js';
import type { ObjectValueNode as IObjectValueNode, ValueNode } from './types.js';
import { ValueType } from './types.js';

export class ObjectValueNode extends BaseValueNode implements IObjectValueNode {
  readonly type = ValueType.Object;

  private _children: Map<string, ValueNode>;
  private _baseChildren: Map<string, ValueNode>;

  constructor(
    id: string | undefined,
    name: string,
    schema: JsonSchema,
    children?: ValueNode[],
  ) {
    super(id, name, schema);

    this._children = observable.map<string, ValueNode>();
    this._baseChildren = new Map();

    if (children) {
      for (const child of children) {
        this._children.set(child.name, child);
        child.parent = this;
      }
    }

    this._baseChildren = new Map(this._children);

    makeObservable(this, {
      _children: 'observable',
      _baseChildren: 'observable',
      value: 'computed',
      children: 'computed',
      isDirty: 'computed',
      errors: 'computed',
      warnings: 'computed',
      addChild: 'action',
      removeChild: 'action',
      commit: 'action',
      revert: 'action',
    });
  }

  get value(): Record<string, ValueNode> {
    return Object.fromEntries(this._children);
  }

  get children(): readonly ValueNode[] {
    return Array.from(this._children.values());
  }

  getPlainValue(): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, node] of this._children) {
      result[key] = node.getPlainValue();
    }
    return result;
  }

  child(name: string): ValueNode | undefined {
    return this._children.get(name);
  }

  hasChild(name: string): boolean {
    return this._children.has(name);
  }

  addChild(node: ValueNode): void {
    const existing = this._children.get(node.name);
    if (existing) {
      existing.parent = null;
    }
    node.parent = this;
    this._children.set(node.name, node);
  }

  removeChild(name: string): void {
    const node = this._children.get(name);
    if (node) {
      node.parent = null;
      this._children.delete(name);
    }
  }

  get isDirty(): boolean {
    if (this._children.size !== this._baseChildren.size) {
      return true;
    }

    for (const [key, child] of this._children) {
      if (this._baseChildren.get(key) !== child) {
        return true;
      }
    }

    for (const child of this._children.values()) {
      if ('isDirty' in child && (child as { isDirty: boolean }).isDirty) {
        return true;
      }
    }

    return false;
  }

  commit(): void {
    this._baseChildren = new Map(this._children);
    for (const child of this._children.values()) {
      if ('commit' in child && typeof child.commit === 'function') {
        (child as { commit: () => void }).commit();
      }
    }
  }

  revert(): void {
    for (const child of this._children.values()) {
      child.parent = null;
    }

    this._children = observable.map<string, ValueNode>();
    for (const [key, value] of this._baseChildren) {
      this._children.set(key, value);
    }

    for (const child of this._children.values()) {
      child.parent = this;
      if ('revert' in child && typeof child.revert === 'function') {
        (child as { revert: () => void }).revert();
      }
    }
  }

  override isObject(): this is IObjectValueNode {
    return true;
  }

  override get errors(): readonly Diagnostic[] {
    const errors: Diagnostic[] = [];

    for (const child of this._children.values()) {
      errors.push(...child.errors);
    }

    return errors;
  }

  override get warnings(): readonly Diagnostic[] {
    const warnings: Diagnostic[] = [];

    for (const child of this._children.values()) {
      warnings.push(...child.warnings);
    }

    return warnings;
  }
}
