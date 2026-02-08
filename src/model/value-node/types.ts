import type { Diagnostic } from '../../core/validation/types.js';
import type { JsonSchema } from '../../types/schema.types.js';
import type { NodeFactory } from './NodeFactory.js';

export enum ValueType {
  String = 'string',
  Number = 'number',
  Boolean = 'boolean',
  Object = 'object',
  Array = 'array',
}

export interface FormulaDefinition {
  readonly expression: string;
  readonly version: number;
}

export interface FormulaWarning {
  readonly type:
    | 'nan'
    | 'infinity'
    | 'type-coercion'
    | 'division-by-zero'
    | 'null-reference'
    | 'runtime-error';
  readonly message: string;
  readonly expression: string;
  readonly computedValue: unknown;
}

export type NodeChangeEvent =
  | { type: 'setValue'; node: ValueNode; value: unknown; oldValue: unknown }
  | { type: 'addChild'; parent: ValueNode; child: ValueNode }
  | { type: 'removeChild'; parent: ValueNode; childName: string; child: ValueNode }
  | { type: 'arrayPush'; array: ValueNode; item: ValueNode }
  | { type: 'arrayInsert'; array: ValueNode; index: number; item: ValueNode }
  | { type: 'arrayRemove'; array: ValueNode; index: number; item: ValueNode }
  | { type: 'arrayMove'; array: ValueNode; fromIndex: number; toIndex: number }
  | { type: 'arrayReplace'; array: ValueNode; index: number; item: ValueNode; oldItem: ValueNode }
  | { type: 'arrayClear'; array: ValueNode; items: readonly ValueNode[] };

export type NodeChangeListener = (event: NodeChangeEvent) => void;

export interface ValueNode {
  readonly id: string;
  readonly type: ValueType;
  readonly schema: JsonSchema;

  parent: ValueNode | null;
  readonly name: string;

  readonly value: unknown;
  getPlainValue(): unknown;

  isObject(): this is ObjectValueNode;
  isArray(): this is ArrayValueNode;
  isPrimitive(): this is PrimitiveValueNode;

  on(event: 'change', listener: NodeChangeListener): void;
  off(event: 'change', listener: NodeChangeListener): void;

  readonly errors: readonly Diagnostic[];
  readonly warnings: readonly Diagnostic[];
  readonly isValid: boolean;
  readonly hasWarnings: boolean;
}

export interface DirtyTrackable {
  readonly isDirty: boolean;
  commit(): void;
  revert(): void;
}

export interface PrimitiveValueNode extends ValueNode, DirtyTrackable {
  value: string | number | boolean;
  readonly baseValue: string | number | boolean;
  readonly defaultValue: unknown;
  readonly formula: FormulaDefinition | undefined;
  readonly formulaWarning: FormulaWarning | null;
  readonly isReadOnly: boolean;

  setValue(value: unknown, options?: { internal?: boolean }): void;
  setFormulaWarning(warning: FormulaWarning | null): void;
}

export interface ObjectValueNode extends ValueNode, DirtyTrackable {
  readonly value: Record<string, ValueNode>;
  readonly children: readonly ValueNode[];

  child(name: string): ValueNode | undefined;
  addChild(node: ValueNode): void;
  removeChild(name: string): void;
  hasChild(name: string): boolean;
  setValue(value: Record<string, unknown>, options?: { internal?: boolean }): void;
}

export interface ArrayValueNode extends ValueNode, DirtyTrackable {
  readonly value: readonly ValueNode[];
  readonly length: number;

  at(index: number): ValueNode | undefined;
  push(node: ValueNode): void;
  insertAt(index: number, node: ValueNode): void;
  removeAt(index: number): void;
  move(fromIndex: number, toIndex: number): void;
  replaceAt(index: number, node: ValueNode): void;
  clear(): void;

  setNodeFactory(factory: NodeFactory): void;
  pushValue(value?: unknown): void;
  insertValueAt(index: number, value?: unknown): void;
  setValue(value: unknown[], options?: { internal?: boolean }): void;
}

export interface ValueNodeOptions {
  readonly id?: string;
  readonly name: string;
  readonly schema: JsonSchema;
  readonly parent?: ValueNode | null;
}

export interface PrimitiveNodeOptions extends ValueNodeOptions {
  readonly value?: unknown;
}

export interface ObjectNodeOptions extends ValueNodeOptions {
  readonly children?: ValueNode[];
}

export interface ArrayNodeOptions extends ValueNodeOptions {
  readonly items?: ValueNode[];
}

export function extractFormulaDefinition(
  schema: JsonSchema,
): FormulaDefinition | undefined {
  if ('x-formula' in schema && schema['x-formula']) {
    const xFormula = schema['x-formula'];
    return { expression: xFormula.expression, version: xFormula.version };
  }
  return undefined;
}
