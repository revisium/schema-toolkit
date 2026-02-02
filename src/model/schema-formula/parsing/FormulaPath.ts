import { parseFormula, type ASTNode } from '@revisium/formula';
import type { Path } from '../../../core/path/index.js';
import { EMPTY_PATH } from '../../../core/path/index.js';

const ARRAY_NOTATION_REGEX = /^([^[]+)\[(?:\d+|\*)?\]$/;

export class FormulaPath {
  constructor(
    private readonly basePath: Path,
    private readonly relativePath: string,
  ) {}

  resolve(): Path | null {
    let ast: ASTNode;
    try {
      const parseResult = parseFormula(this.relativePath);
      ast = parseResult.ast;
    } catch {
      return null;
    }

    return this.astToPath(ast, this.basePath);
  }

  private astToPath(ast: ASTNode, base: Path): Path | null {
    switch (ast.type) {
      case 'Identifier':
        return base.child(ast.name);

      case 'MemberExpression': {
        const objectPath = this.astToPath(ast.object, base);
        if (!objectPath) {
          return null;
        }
        return objectPath.child(ast.property);
      }

      case 'IndexExpression':
      case 'WildcardExpression': {
        const objectPath = this.astToPath(ast.object, base);
        if (!objectPath) {
          return null;
        }
        return objectPath.childItems();
      }

      case 'RelativePath':
        return this.resolveRelativePathString(base, ast.path);

      case 'RootPath':
        return this.resolveRootPath(ast.path);

      default:
        return null;
    }
  }

  private resolveRelativePathString(base: Path, path: string): Path | null {
    const parts = path.split('/');
    let result = base;

    for (const part of parts) {
      if (part === '..') {
        if (result.isEmpty()) {
          return null;
        }
        result = result.parent();
      } else if (part === '.') {
        continue;
      } else if (part) {
        result = result.child(part);
      }
    }

    return result;
  }

  private resolveRootPath(rootPath: string): Path | null {
    const path = rootPath.startsWith('/') ? rootPath.slice(1) : rootPath;
    if (!path) {
      return EMPTY_PATH;
    }

    try {
      return this.parseFormulaPath(path);
    } catch {
      return null;
    }
  }

  private parseFormulaPath(formulaPath: string): Path {
    const parts = formulaPath.split('.');
    let result: Path = EMPTY_PATH;

    for (const part of parts) {
      if (!part) {
        throw new Error(`Invalid path: empty segment`);
      }

      const match = ARRAY_NOTATION_REGEX.exec(part);
      if (match?.[1]) {
        result = result.child(match[1]).childItems();
      } else {
        result = result.child(part);
      }
    }

    return result;
  }
}
