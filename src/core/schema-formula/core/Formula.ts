import type { ASTNode } from '@revisium/formula';
import type { FormulaDependency } from './FormulaDependency.js';

export interface Formula {
  version(): number;
  expression(): string;
  ast(): ASTNode;
  dependencies(): readonly FormulaDependency[];
  getNodeIdForAstPath(astPath: string): string | null;
  astPaths(): readonly string[];
}
