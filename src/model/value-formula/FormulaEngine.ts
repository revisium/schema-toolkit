import { runInAction, reaction } from '../../core/reactivity/index.js';
import type { ValueNode, PrimitiveValueNode } from '../value-node/index.js';
import type {
  FormulaField,
  DependencyMap,
  FormulaEngineOptions,
  ValueTreeRoot,
} from './types.js';
import { FormulaCollector } from './FormulaCollector.js';
import { DependencyGraph } from './DependencyGraph.js';
import { FormulaEvaluator } from './FormulaEvaluator.js';

type ReactionDisposer = () => void;

export class FormulaEngine {
  private readonly collector: FormulaCollector;
  private readonly graph: DependencyGraph;
  private readonly evaluator: FormulaEvaluator;

  private formulas: FormulaField[] = [];
  private dependencyMap: DependencyMap = new Map();
  private evaluationOrder: readonly FormulaField[] = [];
  private disposers: ReactionDisposer[] = [];

  constructor(
    private readonly tree: ValueTreeRoot,
    options: FormulaEngineOptions = {},
  ) {
    this.collector = new FormulaCollector();
    this.graph = new DependencyGraph();
    this.evaluator = new FormulaEvaluator(tree, options);

    this.initialize();
  }

  reinitialize(): void {
    this.disposeReactions();
    this.initialize();
  }

  dispose(): void {
    this.disposeReactions();
    this.formulas = [];
    this.dependencyMap = new Map();
    this.evaluationOrder = [];
  }

  getFormulas(): readonly FormulaField[] {
    return this.formulas;
  }

  getEvaluationOrder(): readonly FormulaField[] {
    return this.evaluationOrder;
  }

  private initialize(): void {
    this.formulas = this.collector.collect(this.tree.root);

    this.dependencyMap = this.graph.buildDependencyMap(this.formulas);
    this.evaluationOrder = this.graph.buildEvaluationOrder(this.formulas);

    this.evaluateAll();

    this.setupReactions();
  }

  private evaluateAll(): void {
    runInAction(() => {
      for (const field of this.evaluationOrder) {
        this.evaluator.evaluate(field);
      }
    });
  }

  private setupReactions(): void {
    const watchedNodes = new Set<PrimitiveValueNode>();

    for (const [depNode] of this.dependencyMap) {
      if (watchedNodes.has(depNode)) {
        continue;
      }
      watchedNodes.add(depNode);

      const disposer = reaction(
        () => depNode.value,
        () => this.handleDependencyChange(depNode),
      );
      this.disposers.push(disposer);
    }

    this.setupArrayReactions(this.tree.root);
  }

  private setupArrayReactions(node: ValueNode): void {
    if (node.isArray()) {
      const disposer = reaction(
        () => node.length,
        () => this.handleStructureChange(),
      );
      this.disposers.push(disposer);

      for (const item of node.value) {
        this.setupArrayReactions(item);
      }
    } else if (node.isObject()) {
      for (const child of node.children) {
        this.setupArrayReactions(child);
      }
    }
  }

  private handleDependencyChange(changedNode: PrimitiveValueNode): void {
    const affected = this.graph.getAffectedFormulas(
      changedNode,
      this.dependencyMap,
      this.evaluationOrder,
    );

    runInAction(() => {
      for (const field of affected) {
        this.evaluator.evaluate(field);
      }
    });
  }

  private handleStructureChange(): void {
    this.reinitialize();
  }

  private disposeReactions(): void {
    for (const disposer of this.disposers) {
      disposer();
    }
    this.disposers = [];
  }
}
