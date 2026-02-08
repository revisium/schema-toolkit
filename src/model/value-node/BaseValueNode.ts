import { EventEmitter } from 'eventemitter3';
import type { Diagnostic } from '../../core/validation/types.js';
import type { JsonSchema } from '../../types/schema.types.js';
import type {
  ArrayValueNode,
  NodeChangeEvent,
  NodeChangeListener,
  ObjectValueNode,
  PrimitiveValueNode,
  ValueNode,
  ValueType,
} from './types.js';

let nodeIdCounter = 0;

export function generateNodeId(): string {
  return `node-${++nodeIdCounter}`;
}

export function resetNodeIdCounter(): void {
  nodeIdCounter = 0;
}

export abstract class BaseValueNode implements ValueNode {
  readonly id: string;
  abstract readonly type: ValueType;
  readonly schema: JsonSchema;

  private _parent: ValueNode | null = null;
  private readonly _name: string;
  private readonly _emitter = new EventEmitter();

  constructor(id: string | undefined, name: string, schema: JsonSchema) {
    this.id = id ?? generateNodeId();
    this._name = name;
    this.schema = schema;
  }

  on(event: 'change', listener: NodeChangeListener): void {
    this._emitter.on(event, listener);
  }

  off(event: 'change', listener: NodeChangeListener): void {
    this._emitter.off(event, listener);
  }

  protected emit(changeEvent: NodeChangeEvent): void {
    this._emitter.emit('change', changeEvent);
  }

  get parent(): ValueNode | null {
    return this._parent;
  }

  set parent(value: ValueNode | null) {
    this._parent = value;
  }

  get name(): string {
    return this._name;
  }

  abstract get value(): unknown;
  abstract getPlainValue(): unknown;

  isObject(): this is ObjectValueNode {
    return false;
  }

  isArray(): this is ArrayValueNode {
    return false;
  }

  isPrimitive(): this is PrimitiveValueNode {
    return false;
  }

  get errors(): readonly Diagnostic[] {
    return [];
  }

  get warnings(): readonly Diagnostic[] {
    return [];
  }

  get isValid(): boolean {
    return this.errors.length === 0;
  }

  get hasWarnings(): boolean {
    return this.warnings.length > 0;
  }
}
