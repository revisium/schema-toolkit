import type { ASTNode } from '@revisium/formula';
import type { Formula } from '../types.js';
import type { FormulaDependency } from '../../schema-formula/index.js';

export class MockFormula implements Formula {
  constructor(
    private readonly _version: number,
    private readonly _expression: string,
  ) {}

  version(): number {
    return this._version;
  }

  expression(): string {
    return this._expression;
  }

  ast(): ASTNode {
    return { type: 'Identifier', name: this._expression };
  }

  dependencies(): readonly FormulaDependency[] {
    return [];
  }

  getNodeIdForAstPath(_astPath: string): string | null {
    return null;
  }

  astPaths(): readonly string[] {
    return [];
  }
}

export function createMockFormula(
  version: number,
  expression: string,
): Formula {
  return new MockFormula(version, expression);
}
