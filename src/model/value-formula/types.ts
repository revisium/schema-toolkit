import type {
  ValueNode,
  PrimitiveValueNode,
  ObjectValueNodeInterface,
  ArrayValueNodeInterface,
} from '../value-node/index.js';

export interface FormulaArrayLevel {
  readonly array: ArrayValueNodeInterface;
  readonly index: number;
}

export interface FormulaField {
  readonly node: PrimitiveValueNode;
  readonly expression: string;
  readonly parent: ObjectValueNodeInterface | null;
  readonly dependencyNodes: readonly PrimitiveValueNode[];
  readonly arrayLevels: readonly FormulaArrayLevel[];
}

export type DependencyMap = Map<PrimitiveValueNode, Set<FormulaField>>;

export interface FormulaEngineOptions {
  onError?: (node: PrimitiveValueNode, error: Error) => void;
  onWarning?: (
    node: PrimitiveValueNode,
    type: string,
    message: string,
  ) => void;
}

export interface ValueTreeRoot {
  readonly root: ValueNode;
  getPlainValue(): unknown;
}
