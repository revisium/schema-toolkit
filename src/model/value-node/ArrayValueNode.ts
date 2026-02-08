import { makeObservable, observable } from '../../core/reactivity/index.js';
import type { Diagnostic } from '../../core/validation/types.js';
import type { JsonArraySchema, JsonSchema } from '../../types/schema.types.js';
import { BaseValueNode } from './BaseValueNode.js';
import type { NodeFactory } from './NodeFactory.js';
import type { ArrayValueNode as IArrayValueNode, ValueNode } from './types.js';
import { ValueType } from './types.js';

export class ArrayValueNode extends BaseValueNode implements IArrayValueNode {
  readonly type = ValueType.Array;

  private _items: ValueNode[];
  private _baseItems: ValueNode[];
  private _nodeFactory: NodeFactory | null = null;

  constructor(
    id: string | undefined,
    name: string,
    schema: JsonSchema,
    items?: ValueNode[],
  ) {
    super(id, name, schema);

    this._items = observable.array<ValueNode>();
    this._baseItems = [];

    if (items) {
      for (const item of items) {
        item.parent = this;
        this._items.push(item);
      }
    }

    this._baseItems = [...this._items];

    makeObservable(this, {
      _items: 'observable',
      _baseItems: 'observable',
      value: 'computed',
      length: 'computed',
      isDirty: 'computed',
      errors: 'computed',
      warnings: 'computed',
      push: 'action',
      insertAt: 'action',
      removeAt: 'action',
      move: 'action',
      replaceAt: 'action',
      clear: 'action',
      commit: 'action',
      revert: 'action',
      pushValue: 'action',
      insertValueAt: 'action',
      setValue: 'action',
    });
  }

  get value(): readonly ValueNode[] {
    return this._items;
  }

  get length(): number {
    return this._items.length;
  }

  getPlainValue(): unknown[] {
    return this._items.map((item) => item.getPlainValue());
  }

  at(index: number): ValueNode | undefined {
    if (index < 0) {
      return this._items[this._items.length + index];
    }
    return this._items[index];
  }

  push(node: ValueNode): void {
    node.parent = this;
    this._items.push(node);
    this.emit({ type: 'arrayPush', array: this, item: node });
  }

  insertAt(index: number, node: ValueNode): void {
    if (index < 0 || index > this._items.length) {
      throw new Error(`Index out of bounds: ${index}`);
    }
    node.parent = this;
    this._items.splice(index, 0, node);
    this.emit({ type: 'arrayInsert', array: this, index, item: node });
  }

  removeAt(index: number): void {
    if (index < 0 || index >= this._items.length) {
      throw new Error(`Index out of bounds: ${index}`);
    }
    const removed = this._items.splice(index, 1)[0];
    if (removed) {
      removed.parent = null;
    }
    this.emit({ type: 'arrayRemove', array: this, index });
  }

  move(fromIndex: number, toIndex: number): void {
    if (fromIndex < 0 || fromIndex >= this._items.length) {
      throw new Error(`Source index out of bounds: ${fromIndex}`);
    }
    if (toIndex < 0 || toIndex >= this._items.length) {
      throw new Error(`Target index out of bounds: ${toIndex}`);
    }
    if (fromIndex === toIndex) {
      return;
    }

    const [item] = this._items.splice(fromIndex, 1);
    if (item) {
      this._items.splice(toIndex, 0, item);
    }
    this.emit({ type: 'arrayMove', array: this, fromIndex, toIndex });
  }

  replaceAt(index: number, node: ValueNode): void {
    if (index < 0 || index >= this._items.length) {
      throw new Error(`Index out of bounds: ${index}`);
    }
    const oldNode = this._items[index];
    if (oldNode) {
      oldNode.parent = null;
    }
    node.parent = this;
    this._items[index] = node;
    this.emit({ type: 'arrayReplace', array: this, index, item: node });
  }

  clear(): void {
    for (const item of this._items) {
      item.parent = null;
    }
    this._items.length = 0;
    this.emit({ type: 'arrayClear', array: this });
  }

  setNodeFactory(factory: NodeFactory): void {
    this._nodeFactory = factory;
  }

  pushValue(value?: unknown): void {
    const node = this.createItemNode(this._items.length, value);
    this.push(node);
  }

  insertValueAt(index: number, value?: unknown): void {
    const node = this.createItemNode(index, value);
    this.insertAt(index, node);
  }

  setValue(value: unknown[], options?: { internal?: boolean }): void {
    const commonLength = Math.min(this._items.length, value.length);

    for (let i = 0; i < commonLength; i++) {
      const item = this._items[i];
      if (!item) {
        continue;
      }

      const itemValue = value[i];

      if (item.isObject()) {
        item.setValue(itemValue as Record<string, unknown>, options);
      } else if (item.isArray()) {
        item.setValue(itemValue as unknown[], options);
      } else if (item.isPrimitive()) {
        item.setValue(itemValue, options);
      }
    }

    if (value.length > this._items.length) {
      for (let i = this._items.length; i < value.length; i++) {
        this.pushValue(value[i]);
      }
    } else if (value.length < this._items.length) {
      for (let i = this._items.length - 1; i >= value.length; i--) {
        this.removeAt(i);
      }
    }
  }

  private createItemNode(index: number, value?: unknown): ValueNode {
    if (!this._nodeFactory) {
      throw new Error('NodeFactory not set');
    }

    const arraySchema = this.schema as JsonArraySchema;
    const itemSchema = arraySchema.items;
    if (!itemSchema) {
      throw new Error('No items schema');
    }

    const itemValue =
      value === undefined && 'default' in itemSchema
        ? itemSchema.default
        : value;
    const node = this._nodeFactory.create(String(index), itemSchema, itemValue);

    this.propagateFactory(node);

    return node;
  }

  private propagateFactory(node: ValueNode): void {
    if (!this._nodeFactory) {
      return;
    }

    if (node.isArray()) {
      node.setNodeFactory(this._nodeFactory);
      for (const item of node.value) {
        this.propagateFactory(item);
      }
    } else if (node.isObject()) {
      for (const child of node.children) {
        this.propagateFactory(child);
      }
    }
  }

  get isDirty(): boolean {
    if (this._items.length !== this._baseItems.length) {
      return true;
    }

    for (let i = 0; i < this._items.length; i++) {
      if (this._items[i] !== this._baseItems[i]) {
        return true;
      }
    }

    for (const item of this._items) {
      if ('isDirty' in item && (item as { isDirty: boolean }).isDirty) {
        return true;
      }
    }

    return false;
  }

  commit(): void {
    this._baseItems = [...this._items];
    for (const item of this._items) {
      if ('commit' in item && typeof item.commit === 'function') {
        (item as { commit: () => void }).commit();
      }
    }
  }

  revert(): void {
    for (const item of this._items) {
      item.parent = null;
    }

    this._items = observable.array<ValueNode>();
    for (const baseItem of this._baseItems) {
      this._items.push(baseItem);
    }

    for (const item of this._items) {
      item.parent = this;
      if ('revert' in item && typeof item.revert === 'function') {
        (item as { revert: () => void }).revert();
      }
    }
  }

  override isArray(): this is IArrayValueNode {
    return true;
  }

  override get errors(): readonly Diagnostic[] {
    const errors: Diagnostic[] = [];

    for (const item of this._items) {
      errors.push(...item.errors);
    }

    return errors;
  }

  override get warnings(): readonly Diagnostic[] {
    const warnings: Diagnostic[] = [];

    for (const item of this._items) {
      warnings.push(...item.warnings);
    }

    return warnings;
  }
}
