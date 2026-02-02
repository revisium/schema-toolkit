import { serializeAst, replaceDependencies } from '@revisium/formula';
import type { SchemaTree } from '../../../core/schema-tree/index.js';
import type { XFormula } from '../../../types/index.js';
import type { Formula } from '../core/Formula.js';
import { FormulaError } from '../core/FormulaError.js';
import { FormulaPathBuilder } from './FormulaPathBuilder.js';

export class FormulaSerializer {
  private readonly pathBuilder = new FormulaPathBuilder();

  constructor(
    private readonly tree: SchemaTree,
    private readonly formulaNodeId: string,
    private readonly formula: Formula,
  ) {}

  static toXFormula(
    tree: SchemaTree,
    formulaNodeId: string,
    formula: Formula,
  ): XFormula {
    const serializer = new FormulaSerializer(tree, formulaNodeId, formula);
    return {
      version: 1,
      expression: serializer.serialize(),
    };
  }

  serialize(): string {
    const replacements = this.buildPathReplacements();
    const updatedAst = replaceDependencies(this.formula.ast(), replacements);
    return serializeAst(updatedAst);
  }

  private buildPathReplacements(): Record<string, string> {
    const replacements: Record<string, string> = {};
    const formulaPath = this.tree.pathOf(this.formulaNodeId);

    for (const astPath of this.formula.astPaths()) {
      const nodeId = this.formula.getNodeIdForAstPath(astPath);
      if (!nodeId) {
        continue;
      }

      const targetNode = this.tree.nodeById(nodeId);
      if (targetNode.isNull()) {
        throw new FormulaError(
          `Cannot serialize formula: target node not found`,
          this.formulaNodeId,
          `Target nodeId: ${nodeId}`,
        );
      }

      const targetPath = this.tree.pathOf(nodeId);
      const newPath = this.pathBuilder.buildWithArrayNotation(
        formulaPath,
        targetPath,
      );

      if (this.needsReplacement(astPath, newPath)) {
        replacements[astPath] = newPath;
      }
    }

    return replacements;
  }

  private needsReplacement(astPath: string, newPath: string): boolean {
    if (astPath === newPath) {
      return false;
    }

    const normalizedAstPath = this.normalizeArrayNotation(astPath);
    const normalizedNewPath = this.normalizeArrayNotation(newPath);

    return normalizedAstPath !== normalizedNewPath;
  }

  private normalizeArrayNotation(path: string): string {
    return path.replaceAll(/\[\d+\]/g, '[*]');
  }
}
