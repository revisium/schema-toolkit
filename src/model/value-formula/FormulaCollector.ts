import { parseExpression } from '@revisium/formula';
import type {
  ValueNode,
  PrimitiveValueNode,
  ObjectValueNodeInterface,
} from '../value-node/index.js';
import type { FormulaField, FormulaArrayLevel } from './types.js';

interface TraverseContext {
  parent: ObjectValueNodeInterface | null;
  arrayLevels: FormulaArrayLevel[];
}

type PathSegment =
  | { type: 'property'; name: string }
  | { type: 'index'; index: number };

const INDEX_REGEX = /^\[(-?\d+)\]/;
const PROP_REGEX = /^\.?([a-zA-Z_]\w*)/;

export class FormulaCollector {
  private root: ValueNode | null = null;

  collect(root: ValueNode): FormulaField[] {
    this.root = root;
    const formulas: FormulaField[] = [];
    this.traverse(root, { parent: null, arrayLevels: [] }, formulas);
    return formulas;
  }

  private traverse(
    node: ValueNode,
    context: TraverseContext,
    formulas: FormulaField[],
  ): void {
    if (node.isPrimitive()) {
      this.collectPrimitive(node, context, formulas);
    } else if (node.isObject()) {
      for (const child of node.children) {
        this.traverse(child, { ...context, parent: node }, formulas);
      }
    } else if (node.isArray()) {
      for (let i = 0; i < node.length; i++) {
        const item = node.at(i);
        if (item) {
          this.traverse(
            item,
            {
              ...context,
              arrayLevels: [...context.arrayLevels, { array: node, index: i }],
            },
            formulas,
          );
        }
      }
    }
  }

  private collectPrimitive(
    node: PrimitiveValueNode,
    context: TraverseContext,
    formulas: FormulaField[],
  ): void {
    const formula = node.formula;
    if (!formula) {
      return;
    }

    const rawDependencies = this.extractDependencies(formula.expression);
    const dependencyNodes = this.resolveDependencies(
      rawDependencies,
      node,
      context,
    );

    formulas.push({
      node,
      expression: formula.expression,
      parent: context.parent,
      dependencyNodes,
      arrayLevels: context.arrayLevels,
    });
  }

  private extractDependencies(expression: string): readonly string[] {
    try {
      const parsed = parseExpression(expression);
      return parsed.dependencies;
    } catch {
      return [];
    }
  }

  private resolveDependencies(
    rawDeps: readonly string[],
    formulaNode: PrimitiveValueNode,
    context: TraverseContext,
  ): PrimitiveValueNode[] {
    const nodes: PrimitiveValueNode[] = [];

    for (const dep of rawDeps) {
      const node = this.resolveOneDependency(dep, formulaNode, context);
      if (node) {
        this.collectPrimitiveNodes(node, nodes);
      }
    }

    return nodes;
  }

  private collectPrimitiveNodes(
    node: ValueNode,
    result: PrimitiveValueNode[],
  ): void {
    if (node.isPrimitive()) {
      result.push(node);
    } else if (node.isArray()) {
      for (let i = 0; i < node.length; i++) {
        const item = node.at(i);
        if (item) {
          this.collectPrimitiveNodes(item, result);
        }
      }
    } else if (node.isObject()) {
      for (const child of node.children) {
        this.collectPrimitiveNodes(child, result);
      }
    }
  }

  private resolveOneDependency(
    dep: string,
    _formulaNode: PrimitiveValueNode,
    context: TraverseContext,
  ): ValueNode | null {
    if (dep.startsWith('/')) {
      return this.resolveFromRoot(dep.slice(1));
    }

    if (dep.startsWith('../')) {
      return this.resolveRelative(dep, context);
    }

    if (context.parent) {
      return this.resolveFromNode(context.parent, dep);
    }

    return this.resolveFromRoot(dep);
  }

  private resolveFromRoot(pathStr: string): ValueNode | null {
    if (!this.root) {
      return null;
    }
    return this.resolveFromNode(this.root, pathStr);
  }

  private resolveFromNode(
    startNode: ValueNode,
    pathStr: string,
  ): ValueNode | null {
    const segments = this.parsePathSegments(pathStr);
    let current: ValueNode | null = startNode;

    for (const segment of segments) {
      if (!current) {
        return null;
      }

      if (segment.type === 'property') {
        if (current.isObject()) {
          current =
            current.children.find((c) => c.name === segment.name) ?? null;
        } else {
          return null;
        }
      } else if (segment.type === 'index') {
        if (current.isArray()) {
          current = current.at(segment.index) ?? null;
        } else {
          return null;
        }
      }
    }

    return current;
  }

  private resolveRelative(
    dep: string,
    context: TraverseContext,
  ): ValueNode | null {
    let upLevels = 0;
    let remaining = dep;

    while (remaining.startsWith('../')) {
      upLevels++;
      remaining = remaining.slice(3);
    }

    let current: ValueNode | null = context.parent;

    for (let i = 0; i < upLevels && current; i++) {
      current = this.findParent(current);
      if (current?.isArray()) {
        current = this.findParent(current);
      }
    }

    if (!current) {
      return null;
    }

    if (remaining) {
      return this.resolveFromNode(current, remaining);
    }

    return current;
  }

  private findParent(node: ValueNode): ValueNode | null {
    if (!this.root || node === this.root) {
      return null;
    }

    return this.findParentRecursive(this.root, node);
  }

  private findParentRecursive(
    current: ValueNode,
    target: ValueNode,
  ): ValueNode | null {
    const children = this.getChildNodes(current);

    for (const child of children) {
      if (child === target) {
        return current;
      }
      const found = this.findParentRecursive(child, target);
      if (found) {
        return found;
      }
    }

    return null;
  }

  private getChildNodes(node: ValueNode): ValueNode[] {
    if (node.isObject()) {
      return [...node.children];
    }
    if (node.isArray()) {
      const items: ValueNode[] = [];
      for (let i = 0; i < node.length; i++) {
        const item = node.at(i);
        if (item) {
          items.push(item);
        }
      }
      return items;
    }
    return [];
  }

  private parsePathSegments(pathStr: string): PathSegment[] {
    const segments: PathSegment[] = [];
    let current = pathStr;

    while (current.length > 0) {
      const indexMatch = INDEX_REGEX.exec(current);
      if (indexMatch?.[1]) {
        segments.push({
          type: 'index',
          index: Number.parseInt(indexMatch[1], 10),
        });
        current = current.slice(indexMatch[0].length);
        continue;
      }

      const propMatch = PROP_REGEX.exec(current);
      if (propMatch?.[1]) {
        segments.push({ type: 'property', name: propMatch[1] });
        current = current.slice(propMatch[0].length);
        continue;
      }

      break;
    }

    return segments;
  }
}
