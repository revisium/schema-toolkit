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
      const patch = { op: 'replace', path: '/properties/name' } as JsonPatch;

      expect(enricher.enrich(patch)).toMatchSnapshot();
    });

    it('extracts nested field name', () => {
      const { current } = treePair(
        objRoot([obj('nested', [str('field')])]),
        objRoot([obj('nested', [str('field')])]),
      );

      const enricher = new PatchEnricher(current, current);
      const patch = { op: 'replace', path: '/properties/nested/properties/field' } as JsonPatch;

      expect(enricher.enrich(patch)).toMatchSnapshot();
    });

    it('extracts array items field name', () => {
      const { current } = treePair(
        objRoot([arr('items', obj('', [str('name')], { id: 'itemsNode' }))]),
        objRoot([arr('items', obj('', [str('name')], { id: 'itemsNode' }))]),
      );

      const enricher = new PatchEnricher(current, current);
      const patch = { op: 'replace', path: '/properties/items/items/properties/name' } as JsonPatch;

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
      const patch = { op: 'add', path: '/properties/computed' } as JsonPatch;

      expect(enricher.enrich(patch)).toMatchSnapshot();
    });

    it('includes description in add patch metadata', () => {
      const { base, current } = treePair(
        objRoot([]),
        objRoot([str('field', { description: 'My description' })]),
      );

      const enricher = new PatchEnricher(current, base);
      const patch = { op: 'add', path: '/properties/field' } as JsonPatch;

      expect(enricher.enrich(patch)).toMatchSnapshot();
    });

    it('includes deprecated in add patch metadata', () => {
      const { base, current } = treePair(
        objRoot([]),
        objRoot([str('field', { deprecated: true })]),
      );

      const enricher = new PatchEnricher(current, base);
      const patch = { op: 'add', path: '/properties/field' } as JsonPatch;

      expect(enricher.enrich(patch)).toMatchSnapshot();
    });

    it('includes non-standard default value in add patch metadata', () => {
      const { base, current } = treePair(
        objRoot([]),
        objRoot([str('field', { default: 'my default' })]),
      );

      const enricher = new PatchEnricher(current, base);
      const patch = { op: 'add', path: '/properties/field' } as JsonPatch;

      expect(enricher.enrich(patch)).toMatchSnapshot();
    });

    it('includes foreignKey in add patch metadata', () => {
      const { base, current } = treePair(
        objRoot([]),
        objRoot([str('categoryId', { foreignKey: 'categories' })]),
      );

      const enricher = new PatchEnricher(current, base);
      const patch = { op: 'add', path: '/properties/categoryId' } as JsonPatch;

      expect(enricher.enrich(patch)).toMatchSnapshot();
    });

    it('skips standard default values in add patch metadata', () => {
      const { base, current } = treePair(
        objRoot([]),
        objRoot([str('field', { default: '' })]),
      );

      const enricher = new PatchEnricher(current, base);
      const patch = { op: 'add', path: '/properties/field' } as JsonPatch;

      expect(enricher.enrich(patch)).toMatchSnapshot();
    });

    it('includes contentMediaType in add patch metadata', () => {
      const { base, current } = treePair(
        objRoot([]),
        objRoot([str('avatar', { contentMediaType: 'text/plain' })]),
      );

      const enricher = new PatchEnricher(current, base);
      const patch = { op: 'add', path: '/properties/avatar' } as JsonPatch;

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
      const patch = { op: 'replace', path: '' } as JsonPatch;

      expect(enricher.enrich(patch)).toMatchSnapshot();
    });

    it('enriches primitive root default change', () => {
      const { base, current } = treePair(
        strRoot({ default: 'old' }),
        strRoot({ default: 'new' }),
      );

      const enricher = new PatchEnricher(current, base);
      const patch = { op: 'replace', path: '' } as JsonPatch;

      expect(enricher.enrich(patch)).toMatchSnapshot();
    });
  });

  describe('replace patch enrichment', () => {
    it('detects contentMediaType change', () => {
      const { base, current } = treePair(
        objRoot([str('image', { contentMediaType: 'text/plain' })]),
        objRoot([str('image', { contentMediaType: 'text/markdown' })]),
      );

      const enricher = new PatchEnricher(current, base);
      const patch = { op: 'replace', path: '/properties/image' } as JsonPatch;

      expect(enricher.enrich(patch)).toMatchSnapshot();
    });

    it('detects contentMediaType removal', () => {
      const { base, current } = treePair(
        objRoot([str('image', { contentMediaType: 'text/plain' })]),
        objRoot([str('image')]),
      );

      const enricher = new PatchEnricher(current, base);
      const patch = { op: 'replace', path: '/properties/image' } as JsonPatch;

      expect(enricher.enrich(patch)).toMatchSnapshot();
    });

    it('detects contentMediaType addition', () => {
      const { base, current } = treePair(
        objRoot([str('image')]),
        objRoot([str('image', { contentMediaType: 'text/plain' })]),
      );

      const enricher = new PatchEnricher(current, base);
      const patch = { op: 'replace', path: '/properties/image' } as JsonPatch;

      expect(enricher.enrich(patch)).toMatchSnapshot();
    });
  });

  describe('move patch enrichment', () => {
    it('detects rename (same parent)', () => {
      const { base, current } = treePair(
        objRoot([str('oldName')]),
        objRoot([str('newName')]),
      );

      const enricher = new PatchEnricher(current, base);
      const patch: JsonPatch = {
        op: 'move',
        from: '/properties/oldName',
        path: '/properties/newName',
      };

      expect(enricher.enrich(patch)).toMatchSnapshot();
    });

    it('detects movesIntoArray when moving from root to array items', () => {
      const { base, current } = treePair(
        objRoot([str('field'), arr('items', obj('', []))]),
        objRoot([arr('items', obj('', [str('field')]))]),
      );

      const enricher = new PatchEnricher(current, base);
      const patch: JsonPatch = {
        op: 'move',
        from: '/properties/field',
        path: '/properties/items/items/properties/field',
      };

      expect(enricher.enrich(patch)).toMatchSnapshot();
    });

    it('does not set movesIntoArray when moving within same level', () => {
      const { base, current } = treePair(
        objRoot([obj('nested', [str('field')])]),
        objRoot([obj('other', [str('field')])]),
      );

      const enricher = new PatchEnricher(current, base);
      const patch: JsonPatch = {
        op: 'move',
        from: '/properties/nested/properties/field',
        path: '/properties/other/properties/field',
      };

      expect(enricher.enrich(patch)).toMatchSnapshot();
    });

    it('does not set movesIntoArray when moving out of array', () => {
      const { base, current } = treePair(
        objRoot([arr('items', obj('', [str('field')]))]),
        objRoot([arr('items', obj('', [])), str('field')]),
      );

      const enricher = new PatchEnricher(current, base);
      const patch: JsonPatch = {
        op: 'move',
        from: '/properties/items/items/properties/field',
        path: '/properties/field',
      };

      expect(enricher.enrich(patch)).toMatchSnapshot();
    });

    it('detects movesIntoArray when moving into deeper array nesting', () => {
      const { base, current } = treePair(
        objRoot([
          arr('outer', obj('', [str('field')])),
          arr('items', obj('', [arr('nested', obj('', []))])),
        ]),
        objRoot([
          arr('outer', obj('', [])),
          arr('items', obj('', [arr('nested', obj('', [str('field')]))])),
        ]),
      );

      const enricher = new PatchEnricher(current, base);
      const patch: JsonPatch = {
        op: 'move',
        from: '/properties/outer/items/properties/field',
        path: '/properties/items/items/properties/nested/items/properties/field',
      };

      expect(enricher.enrich(patch)).toMatchSnapshot();
    });
  });
});
