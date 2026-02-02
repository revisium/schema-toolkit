import { EMPTY_PATH, jsonPointerToPath } from '../../../core/path/index.js';
import { FormulaPath } from '../parsing/index.js';

describe('FormulaPath', () => {
  describe('resolve()', () => {
    describe('simple identifiers', () => {
      it('resolves identifier from root', () => {
        const basePath = EMPTY_PATH;
        const formulaPath = new FormulaPath(basePath, 'fieldName');
        const resolved = formulaPath.resolve();

        expect(resolved).not.toBeNull();
        expect(resolved?.asJsonPointer()).toBe('/properties/fieldName');
      });

      it('resolves identifier from nested path', () => {
        const basePath = jsonPointerToPath('/properties/parent');
        const formulaPath = new FormulaPath(basePath, 'sibling');
        const resolved = formulaPath.resolve();

        expect(resolved).not.toBeNull();
        expect(resolved?.asJsonPointer()).toBe('/properties/parent/properties/sibling');
      });
    });

    describe('member expressions (dot notation)', () => {
      it('resolves nested member expression', () => {
        const basePath = EMPTY_PATH;
        const formulaPath = new FormulaPath(basePath, 'parent.child');
        const resolved = formulaPath.resolve();

        expect(resolved).not.toBeNull();
        expect(resolved?.asJsonPointer()).toBe('/properties/parent/properties/child');
      });

      it('resolves deeply nested member expression', () => {
        const basePath = EMPTY_PATH;
        const formulaPath = new FormulaPath(basePath, 'a.b.c.d');
        const resolved = formulaPath.resolve();

        expect(resolved).not.toBeNull();
        expect(resolved?.asJsonPointer()).toBe(
          '/properties/a/properties/b/properties/c/properties/d',
        );
      });
    });

    describe('relative paths (..)', () => {
      it('resolves single parent reference', () => {
        const basePath = jsonPointerToPath('/properties/parent/properties/child');
        const formulaPath = new FormulaPath(basePath, '../sibling');
        const resolved = formulaPath.resolve();

        expect(resolved).not.toBeNull();
        expect(resolved?.asJsonPointer()).toBe('/properties/parent/properties/sibling');
      });

      it('resolves multiple parent references', () => {
        const basePath = jsonPointerToPath('/properties/a/properties/b/properties/c');
        const formulaPath = new FormulaPath(basePath, '../../sibling');
        const resolved = formulaPath.resolve();

        expect(resolved).not.toBeNull();
        expect(resolved?.asJsonPointer()).toBe('/properties/a/properties/sibling');
      });

      it('returns null when going above root', () => {
        const basePath = jsonPointerToPath('/properties/single');
        const formulaPath = new FormulaPath(basePath, '../../invalid');
        const resolved = formulaPath.resolve();

        expect(resolved).toBeNull();
      });

      it('handles path with nested parent and child', () => {
        const basePath = jsonPointerToPath('/properties/a/properties/b/properties/c');
        const formulaPath = new FormulaPath(basePath, '../d');
        const resolved = formulaPath.resolve();

        expect(resolved).not.toBeNull();
        expect(resolved?.asJsonPointer()).toBe('/properties/a/properties/b/properties/d');
      });
    });

    describe('root paths (/)', () => {
      it('resolves absolute root path', () => {
        const basePath = jsonPointerToPath('/properties/nested/properties/deep');
        const formulaPath = new FormulaPath(basePath, '/rootField');
        const resolved = formulaPath.resolve();

        expect(resolved).not.toBeNull();
        expect(resolved?.asJsonPointer()).toBe('/properties/rootField');
      });

      it('resolves absolute nested path', () => {
        const basePath = jsonPointerToPath('/properties/somewhere/properties/else');
        const formulaPath = new FormulaPath(basePath, '/config.settings');
        const resolved = formulaPath.resolve();

        expect(resolved).not.toBeNull();
        expect(resolved?.asJsonPointer()).toBe('/properties/config/properties/settings');
      });

      it('returns null for invalid root path with empty segment', () => {
        const basePath = EMPTY_PATH;
        const formulaPath = new FormulaPath(basePath, '/a..b');
        const resolved = formulaPath.resolve();

        expect(resolved).toBeNull();
      });

      it('returns null for standalone root slash', () => {
        const basePath = jsonPointerToPath('/properties/field');
        const formulaPath = new FormulaPath(basePath, '/');
        const resolved = formulaPath.resolve();

        expect(resolved).toBeNull();
      });

      it('handles root path with array notation', () => {
        const basePath = jsonPointerToPath('/properties/other');
        const formulaPath = new FormulaPath(basePath, '/items[*].value');
        const resolved = formulaPath.resolve();

        expect(resolved).not.toBeNull();
        expect(resolved?.asJsonPointer()).toBe('/properties/items/items/properties/value');
      });

      it('handles root path with indexed array', () => {
        const basePath = EMPTY_PATH;
        const formulaPath = new FormulaPath(basePath, '/data[0].field');
        const resolved = formulaPath.resolve();

        expect(resolved).not.toBeNull();
        expect(resolved?.asJsonPointer()).toBe('/properties/data/items/properties/field');
      });
    });

    describe('array access ([*] and [n])', () => {
      it('resolves wildcard array access', () => {
        const basePath = EMPTY_PATH;
        const formulaPath = new FormulaPath(basePath, 'items[*]');
        const resolved = formulaPath.resolve();

        expect(resolved).not.toBeNull();
        expect(resolved?.asJsonPointer()).toBe('/properties/items/items');
      });

      it('resolves indexed array access', () => {
        const basePath = EMPTY_PATH;
        const formulaPath = new FormulaPath(basePath, 'items[0]');
        const resolved = formulaPath.resolve();

        expect(resolved).not.toBeNull();
        expect(resolved?.asJsonPointer()).toBe('/properties/items/items');
      });

      it('resolves chained array and member access', () => {
        const basePath = EMPTY_PATH;
        const formulaPath = new FormulaPath(basePath, 'items[*].value');
        const resolved = formulaPath.resolve();

        expect(resolved).not.toBeNull();
        expect(resolved?.asJsonPointer()).toBe('/properties/items/items/properties/value');
      });

      it('resolves nested array access', () => {
        const basePath = EMPTY_PATH;
        const formulaPath = new FormulaPath(basePath, 'matrix[0][1]');
        const resolved = formulaPath.resolve();

        expect(resolved).not.toBeNull();
        expect(resolved?.asJsonPointer()).toBe('/properties/matrix/items/items');
      });
    });

    describe('error handling', () => {
      it('returns null for invalid formula syntax', () => {
        const basePath = EMPTY_PATH;
        const formulaPath = new FormulaPath(basePath, '+++invalid');
        const resolved = formulaPath.resolve();

        expect(resolved).toBeNull();
      });

      it('returns null for unsupported AST node type', () => {
        const basePath = EMPTY_PATH;
        const formulaPath = new FormulaPath(basePath, '1 + 2');
        const resolved = formulaPath.resolve();

        expect(resolved).toBeNull();
      });

      it('returns null for empty path after parent navigation', () => {
        const basePath = EMPTY_PATH;
        const formulaPath = new FormulaPath(basePath, '../something');
        const resolved = formulaPath.resolve();

        expect(resolved).toBeNull();
      });

      it('returns null for function call expression', () => {
        const basePath = EMPTY_PATH;
        const formulaPath = new FormulaPath(basePath, 'SUM(a, b)');
        const resolved = formulaPath.resolve();

        expect(resolved).toBeNull();
      });

      it('returns null for ternary expression', () => {
        const basePath = EMPTY_PATH;
        const formulaPath = new FormulaPath(basePath, 'a ? b : c');
        const resolved = formulaPath.resolve();

        expect(resolved).toBeNull();
      });
    });

    describe('edge cases for array notation in root path', () => {
      it('handles multiple array notations in root path', () => {
        const basePath = EMPTY_PATH;
        const formulaPath = new FormulaPath(basePath, '/matrix[*].rows[0].value');
        const resolved = formulaPath.resolve();

        expect(resolved).not.toBeNull();
        expect(resolved?.asJsonPointer()).toBe(
          '/properties/matrix/items/properties/rows/items/properties/value',
        );
      });

      it('handles simple field without array notation', () => {
        const basePath = EMPTY_PATH;
        const formulaPath = new FormulaPath(basePath, '/simple');
        const resolved = formulaPath.resolve();

        expect(resolved).not.toBeNull();
        expect(resolved?.asJsonPointer()).toBe('/properties/simple');
      });
    });
  });
});
