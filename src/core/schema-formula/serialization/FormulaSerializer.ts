import { serializeAst, replaceDependencies } from '@revisium/formula';
import type { SchemaTree } from '../../schema-tree/index.js';
import type { XFormula } from '../../../types/index.js';
import type { Formula } from '../core/Formula.js';
import { FormulaError } from '../core/FormulaError.js';
import { FormulaPathBuilder } from './FormulaPathBuilder.js';

export interface SerializeOptions {
  readonly strict?: boolean;
}

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

  static serializeExpression(
    tree: SchemaTree,
    formulaNodeId: string,
    formula: Formula,
    options: SerializeOptions = {},
  ): string {
    const serializer = new FormulaSerializer(tree, formulaNodeId, formula);
    return serializer.serialize(options);
  }

  serialize(options: SerializeOptions = {}): string {
    const replacements = this.buildPathReplacements(options);
    const updatedAst = replaceDependencies(this.formula.ast(), replacements);
    return serializeAst(updatedAst);
  }

  private buildPathReplacements(options: SerializeOptions): Record<string, string> {
    const replacements: Record<string, string> = {};
    const formulaPath = this.tree.pathOf(this.formulaNodeId);
    const strict = options.strict ?? true;

    for (const astPath of this.formula.astPaths()) {
      const nodeId = this.formula.getNodeIdForAstPath(astPath);
      if (!nodeId) {
        continue;
      }

      const targetNode = this.tree.nodeById(nodeId);
      if (targetNode.isNull()) {
        if (strict) {
          throw new FormulaError(
            `Cannot serialize formula: target node not found`,
            this.formulaNodeId,
            `Target nodeId: ${nodeId}`,
          );
        }
        continue;
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
