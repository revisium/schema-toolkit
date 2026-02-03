import { describe, it, expect } from '@jest/globals';
import { PatchEnricher } from '../PatchEnricher.js';
import {
  treePair,
  objRoot,
  str,
} from './test-helpers.js';
import type { JsonPatch } from '../types.js';

describe('PatchEnricher edge cases', () => {
  describe('invalid paths', () => {
    it('handles invalid json pointer in path', () => {
      const { current, base } = treePair(
        objRoot([str('field')]),
        objRoot([str('field')]),
      );

      const enricher = new PatchEnricher(current, base);
      const patch = { op: 'add', path: 'invalid-no-slash' } as JsonPatch;

      expect(enricher.enrich(patch)).toMatchSnapshot();
    });

    it('handles invalid json pointer in move from path', () => {
      const { current, base } = treePair(
        objRoot([str('field')]),
        objRoot([str('field')]),
      );

      const enricher = new PatchEnricher(current, base);
      const patch: JsonPatch = {
        op: 'move',
        from: 'invalid-no-slash',
        path: '/properties/field',
      };

      expect(enricher.enrich(patch)).toMatchSnapshot();
    });

    it('handles path to non-existent node', () => {
      const { current, base } = treePair(
        objRoot([str('field')]),
        objRoot([str('field')]),
      );

      const enricher = new PatchEnricher(current, base);
      const patch = {
        op: 'add',
        path: '/properties/nonexistent/properties/deep',
      } as JsonPatch;

      expect(enricher.enrich(patch)).toMatchSnapshot();
    });
  });
});
