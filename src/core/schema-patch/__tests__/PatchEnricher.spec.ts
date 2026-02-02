import { describe, it, expect } from '@jest/globals';
import { PatchEnricher } from '../PatchEnricher.js';
import {
  treePair,
  objRoot,
  strRoot,
  obj,
  arr,
  str,
  num,
  createMockFormula,
} from './test-helpers.js';
import type { JsonPatch } from '../types.js';

describe('PatchEnricher', () => {
  describe('fieldName extraction', () => {
    it('extracts simple field name', () => {
      const { current } = treePair(
        objRoot([str('name')]),
        objRoot([str('name')]),
      );

      const enricher = new PatchEnricher(current, current);
      const patch: JsonPatch = { op: 'replace', path: '/properties/name' };

      expect(enricher.enrich(patch)).toMatchSnapshot();
    });

    it('extracts nested field name', () => {
      const { current } = treePair(
        objRoot([obj('nested', [str('field')])]),
        objRoot([obj('nested', [str('field')])]),
      );

      const enricher = new PatchEnricher(current, current);
      const patch: JsonPatch = { op: 'replace', path: '/properties/nested/properties/field' };

      expect(enricher.enrich(patch)).toMatchSnapshot();
    });

    it('extracts array items field name', () => {
      const { current } = treePair(
        objRoot([arr('items', obj('', [str('name')], { id: 'itemsNode' }))]),
        objRoot([arr('items', obj('', [str('name')], { id: 'itemsNode' }))]),
      );

      const enricher = new PatchEnricher(current, current);
      const patch: JsonPatch = { op: 'replace', path: '/properties/items/items/properties/name' };

      expect(enricher.enrich(patch)).toMatchSnapshot();
    });
  });

  describe('add patch enrichment', () => {
    it('includes formula in add patch metadata', () => {
      const { base, current } = treePair(
        objRoot([]),
        objRoot([num('computed', { formula: createMockFormula(1, 'value * 2') })]),
      );

      const enricher = new PatchEnricher(current, base);
      const patch: JsonPatch = { op: 'add', path: '/properties/computed' };

      expect(enricher.enrich(patch)).toMatchSnapshot();
    });

    it('includes description in add patch metadata', () => {
      const { base, current } = treePair(
        objRoot([]),
        objRoot([str('field', { description: 'My description' })]),
      );

      const enricher = new PatchEnricher(current, base);
      const patch: JsonPatch = { op: 'add', path: '/properties/field' };

      expect(enricher.enrich(patch)).toMatchSnapshot();
    });

    it('includes deprecated in add patch metadata', () => {
      const { base, current } = treePair(
        objRoot([]),
        objRoot([str('field', { deprecated: true })]),
      );

      const enricher = new PatchEnricher(current, base);
      const patch: JsonPatch = { op: 'add', path: '/properties/field' };

      expect(enricher.enrich(patch)).toMatchSnapshot();
    });

    it('includes non-standard default value in add patch metadata', () => {
      const { base, current } = treePair(
        objRoot([]),
        objRoot([str('field', { default: 'my default' })]),
      );

      const enricher = new PatchEnricher(current, base);
      const patch: JsonPatch = { op: 'add', path: '/properties/field' };

      expect(enricher.enrich(patch)).toMatchSnapshot();
    });

    it('includes foreignKey in add patch metadata', () => {
      const { base, current } = treePair(
        objRoot([]),
        objRoot([str('categoryId', { foreignKey: 'categories' })]),
      );

      const enricher = new PatchEnricher(current, base);
      const patch: JsonPatch = { op: 'add', path: '/properties/categoryId' };

      expect(enricher.enrich(patch)).toMatchSnapshot();
    });

    it('skips standard default values in add patch metadata', () => {
      const { base, current } = treePair(
        objRoot([]),
        objRoot([str('field', { default: '' })]),
      );

      const enricher = new PatchEnricher(current, base);
      const patch: JsonPatch = { op: 'add', path: '/properties/field' };

      expect(enricher.enrich(patch)).toMatchSnapshot();
    });
  });

  describe('remove patch enrichment', () => {
    it('returns patch with fieldName only', () => {
      const { current } = treePair(
        objRoot([str('field')]),
        objRoot([str('field')]),
      );

      const enricher = new PatchEnricher(current, current);
      const patch: JsonPatch = { op: 'remove', path: '/properties/field' };

      expect(enricher.enrich(patch)).toMatchSnapshot();
    });
  });

  describe('root node patches', () => {
    it('enriches root description change', () => {
      const { base, current } = treePair(
        objRoot([]),
        objRoot([], { description: 'Root description' }),
      );

      const enricher = new PatchEnricher(current, base);
      const patch: JsonPatch = { op: 'replace', path: '' };

      expect(enricher.enrich(patch)).toMatchSnapshot();
    });

    it('enriches primitive root default change', () => {
      const { base, current } = treePair(
        strRoot({ default: 'old' }),
        strRoot({ default: 'new' }),
      );

      const enricher = new PatchEnricher(current, base);
      const patch: JsonPatch = { op: 'replace', path: '' };

      expect(enricher.enrich(patch)).toMatchSnapshot();
    });
  });
});
