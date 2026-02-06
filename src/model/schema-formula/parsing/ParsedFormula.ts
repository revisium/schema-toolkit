import { parseFormula, type ASTNode } from '@revisium/formula';
import type { Path } from '../../../core/path/index.js';
import type { SchemaTree } from '../../../core/schema-tree/index.js';
import type { Formula } from '../../../core/schema-formula/core/Formula.js';
import type { FormulaDependency } from '../../../core/schema-formula/core/FormulaDependency.js';
import { ResolvedDependency } from '../../../core/schema-formula/core/FormulaDependency.js';
import { FormulaError } from '../../../core/schema-formula/core/FormulaError.js';
import { FormulaPath } from './FormulaPath.js';

export class ParsedFormula implements Formula {
  private readonly _expression: string;
  private readonly astNode: ASTNode;
  private readonly deps: readonly FormulaDependency[];
  private readonly astPathToNodeId: ReadonlyMap<string, string>;

  constructor(tree: SchemaTree, formulaNodeId: string, expression: string) {
    this._expression = expression;
    const parseResult = parseFormula(expression);
    this.astNode = parseResult.ast;

    const formulaPath = tree.pathOf(formulaNodeId);
    if (formulaPath.isEmpty() && tree.root().id() !== formulaNodeId) {
      throw new FormulaError('Formula node not found in tree', formulaNodeId);
    }

    const deps: FormulaDependency[] = [];
    const astPathToNodeId = new Map<string, string>();

    for (const depPath of parseResult.dependencies) {
      const targetNodeId = this.resolveDependencyPath(
        tree,
        formulaPath,
        depPath,
      );
      if (!targetNodeId) {
        throw new FormulaError(
          `Cannot resolve formula dependency: ${depPath}`,
          formulaNodeId,
          'Path not found in schema',
        );
      }
      if (targetNodeId === formulaNodeId) {
        throw new FormulaError(
          'Formula cannot reference itself',
          formulaNodeId,
          'Self-reference detected',
        );
      }
      deps.push(new ResolvedDependency(targetNodeId));
      astPathToNodeId.set(depPath, targetNodeId);
    }

    this.deps = deps;
    this.astPathToNodeId = astPathToNodeId;
  }

  version(): number {
    return 1;
  }

  expression(): string {
    return this._expression;
  }

  ast(): ASTNode {
    return this.astNode;
  }

  dependencies(): readonly FormulaDependency[] {
    return this.deps;
  }

  getNodeIdForAstPath(astPath: string): string | null {
    return this.astPathToNodeId.get(astPath) ?? null;
  }

  astPaths(): readonly string[] {
    return Array.from(this.astPathToNodeId.keys());
  }

  private resolveDependencyPath(
    tree: SchemaTree,
    formulaNodePath: Path,
    depPath: string,
  ): string | null {
    const basePath = this.getFormulaBasePath(formulaNodePath);
    const depFormulaPath = new FormulaPath(basePath, depPath);
    const targetPath = depFormulaPath.resolve();

    if (!targetPath) {
      return null;
    }

    const targetNode = tree.nodeAt(targetPath);
    if (targetNode.isNull()) {
      return null;
    }

    return targetNode.id();
  }

  private getFormulaBasePath(formulaPath: Path): Path {
    let basePath = formulaPath;

    while (!basePath.isEmpty()) {
      const segs = basePath.segments();
      const lastSeg = segs[segs.length - 1];
      basePath = basePath.parent();
      if (!lastSeg?.isItems()) {
        break;
      }
    }

    return basePath;
  }
}
