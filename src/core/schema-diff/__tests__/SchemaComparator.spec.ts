import { describe, it, expect, beforeEach } from '@jest/globals';
import { areNodesEqual } from '../SchemaComparator.js';
import {
  stringNode,
  numberNode,
  objectNode,
  arrayNode,
  refNode,
  stringNodeWithFormula,
  nullNode,
  resetIdCounter,
} from './test-helpers.js';

beforeEach(() => {
  resetIdCounter();
});

describe('SchemaComparator', () => {
  describe('areNodesEqual', () => {
    describe('primitives', () => {
      it('returns true for identical string nodes', () => {
        const a = stringNode('name', 'default');
        const b = stringNode('name', 'default');

        expect(areNodesEqual(a, b)).toBe(true);
      });

      it('returns false when default values differ', () => {
        const a = stringNode('name', 'a');
        const b = stringNode('name', 'b');

        expect(areNodesEqual(a, b)).toBe(false);
      });

      it('returns false when types differ', () => {
        const a = stringNode('field');
        const b = numberNode('field');

        expect(areNodesEqual(a, b)).toBe(false);
      });

      it('returns false when names differ', () => {
        const a = stringNode('name');
        const b = stringNode('title');

        expect(areNodesEqual(a, b)).toBe(false);
      });
    });

    describe('metadata', () => {
      it('returns true when metadata is identical', () => {
        const a = stringNode('name', '', { description: 'desc' });
        const b = stringNode('name', '', { description: 'desc' });

        expect(areNodesEqual(a, b)).toBe(true);
      });

      it('returns false when description differs', () => {
        const a = stringNode('name', '', { description: 'old' });
        const b = stringNode('name', '', { description: 'new' });

        expect(areNodesEqual(a, b)).toBe(false);
      });

      it('returns false when deprecated differs', () => {
        const a = stringNode('name', '', {});
        const b = stringNode('name', '', { deprecated: true });

        expect(areNodesEqual(a, b)).toBe(false);
      });

      it('returns false when title differs', () => {
        const a = stringNode('name', '', { title: 'A' });
        const b = stringNode('name', '', { title: 'B' });

        expect(areNodesEqual(a, b)).toBe(false);
      });
    });

    describe('objects', () => {
      it('returns true for empty objects', () => {
        const a = objectNode('obj');
        const b = objectNode('obj');

        expect(areNodesEqual(a, b)).toBe(true);
      });

      it('returns true for objects with same children', () => {
        const a = objectNode('obj', [stringNode('name'), numberNode('age')]);
        const b = objectNode('obj', [stringNode('name'), numberNode('age')]);

        expect(areNodesEqual(a, b)).toBe(true);
      });

      it('returns false when child count differs', () => {
        const a = objectNode('obj', [stringNode('name')]);
        const b = objectNode('obj', [stringNode('name'), numberNode('age')]);

        expect(areNodesEqual(a, b)).toBe(false);
      });

      it('returns false when child differs', () => {
        const a = objectNode('obj', [stringNode('name', 'a')]);
        const b = objectNode('obj', [stringNode('name', 'b')]);

        expect(areNodesEqual(a, b)).toBe(false);
      });
    });

    describe('arrays', () => {
      it('returns true for arrays with same items', () => {
        const a = arrayNode('arr', stringNode('item'));
        const b = arrayNode('arr', stringNode('item'));

        expect(areNodesEqual(a, b)).toBe(true);
      });

      it('returns false when items differ', () => {
        const a = arrayNode('arr', stringNode('item'));
        const b = arrayNode('arr', numberNode('item'));

        expect(areNodesEqual(a, b)).toBe(false);
      });
    });

    describe('refs', () => {
      it('returns true for refs with same reference', () => {
        const a = refNode('field', 'File');
        const b = refNode('field', 'File');

        expect(areNodesEqual(a, b)).toBe(true);
      });

      it('returns false when ref differs', () => {
        const a = refNode('field', 'File');
        const b = refNode('field', 'Image');

        expect(areNodesEqual(a, b)).toBe(false);
      });
    });

    describe('null nodes', () => {
      it('returns true for two null nodes', () => {
        const a = nullNode();
        const b = nullNode();

        expect(areNodesEqual(a, b)).toBe(true);
      });
    });

    describe('formulas', () => {
      it('returns true for same formula expression', () => {
        const a = stringNodeWithFormula('computed', 'a + b');
        const b = stringNodeWithFormula('computed', 'a + b');

        expect(areNodesEqual(a, b)).toBe(true);
      });

      it('returns false when formula expressions differ', () => {
        const a = stringNodeWithFormula('computed', 'a + b');
        const b = stringNodeWithFormula('computed', 'a - b');

        expect(areNodesEqual(a, b)).toBe(false);
      });

      it('returns false when one has formula and other does not', () => {
        const a = stringNodeWithFormula('field', 'a + b');
        const b = stringNode('field');

        expect(areNodesEqual(a, b)).toBe(false);
      });

      it('returns false when other has formula and first does not', () => {
        const a = stringNode('field');
        const b = stringNodeWithFormula('field', 'a + b');

        expect(areNodesEqual(a, b)).toBe(false);
      });
    });

    describe('nested structures', () => {
      it('returns true for identical nested structure', () => {
        const a = objectNode('root', [
          objectNode('nested', [stringNode('deep')]),
        ]);
        const b = objectNode('root', [
          objectNode('nested', [stringNode('deep')]),
        ]);

        expect(areNodesEqual(a, b)).toBe(true);
      });

      it('returns false when deep child differs', () => {
        const a = objectNode('root', [
          objectNode('nested', [stringNode('deep', 'a')]),
        ]);
        const b = objectNode('root', [
          objectNode('nested', [stringNode('deep', 'b')]),
        ]);

        expect(areNodesEqual(a, b)).toBe(false);
      });
    });
  });
});
