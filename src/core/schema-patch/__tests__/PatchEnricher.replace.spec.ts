import { describe, it, expect } from '@jest/globals';
import { PatchEnricher } from '../PatchEnricher.js';
import {
  treePair,
  objRoot,
  obj,
  arr,
  str,
  num,
} from './test-helpers.js';
import type { JsonPatch } from '../types.js';

describe('PatchEnricher replace patch enrichment', () => {
  it('detects type change', () => {
    const { base, current } = treePair(
      objRoot([str('field', { id: 'old-field' })]),
      objRoot([num('field', { id: 'new-field' })]),
    );

    current.trackReplacement('old-field', 'new-field');

    const enricher = new PatchEnricher(current, base);
    const patch: JsonPatch = { op: 'replace', path: '/properties/field' };

    expect(enricher.enrich(patch)).toMatchSnapshot();
  });

  it('detects array type with items', () => {
    const { base, current } = treePair(
      objRoot([str('field', { id: 'old-field' })]),
      objRoot([arr('field', num('', { id: 'items' }), { id: 'new-field' })]),
    );

    current.trackReplacement('old-field', 'new-field');

    const enricher = new PatchEnricher(current, base);
    const patch: JsonPatch = { op: 'replace', path: '/properties/field' };

    expect(enricher.enrich(patch)).toMatchSnapshot();
  });

  it('detects formula addition', () => {
    const { base, current } = treePair(
      objRoot([num('field')]),
      objRoot([num('field', { formula: { version: 1, expression: 'value * 2' } })]),
    );

    const enricher = new PatchEnricher(current, base);
    const patch: JsonPatch = { op: 'replace', path: '/properties/field' };

    expect(enricher.enrich(patch)).toMatchSnapshot();
  });

  it('detects formula removal', () => {
    const { base, current } = treePair(
      objRoot([num('field', { formula: { version: 1, expression: 'value * 2' } })]),
      objRoot([num('field')]),
    );

    const enricher = new PatchEnricher(current, base);
    const patch: JsonPatch = { op: 'replace', path: '/properties/field' };

    expect(enricher.enrich(patch)).toMatchSnapshot();
  });

  it('detects formula change', () => {
    const { base, current } = treePair(
      objRoot([num('field', { formula: { version: 1, expression: 'value * 2' } })]),
      objRoot([num('field', { formula: { version: 1, expression: 'value * 3' } })]),
    );

    const enricher = new PatchEnricher(current, base);
    const patch: JsonPatch = { op: 'replace', path: '/properties/field' };

    expect(enricher.enrich(patch)).toMatchSnapshot();
  });

  it('detects default value change', () => {
    const { base, current } = treePair(
      objRoot([str('field', { default: 'old' })]),
      objRoot([str('field', { default: 'new' })]),
    );

    const enricher = new PatchEnricher(current, base);
    const patch: JsonPatch = { op: 'replace', path: '/properties/field' };

    expect(enricher.enrich(patch)).toMatchSnapshot();
  });

  it('detects description change', () => {
    const { base, current } = treePair(
      objRoot([str('field', { description: 'old' })]),
      objRoot([str('field', { description: 'new' })]),
    );

    const enricher = new PatchEnricher(current, base);
    const patch: JsonPatch = { op: 'replace', path: '/properties/field' };

    expect(enricher.enrich(patch)).toMatchSnapshot();
  });

  it('detects deprecated change', () => {
    const { base, current } = treePair(
      objRoot([str('field')]),
      objRoot([str('field', { deprecated: true })]),
    );

    const enricher = new PatchEnricher(current, base);
    const patch: JsonPatch = { op: 'replace', path: '/properties/field' };

    expect(enricher.enrich(patch)).toMatchSnapshot();
  });

  it('detects foreignKey change', () => {
    const { base, current } = treePair(
      objRoot([str('field', { foreignKey: 'users' })]),
      objRoot([str('field', { foreignKey: 'categories' })]),
    );

    const enricher = new PatchEnricher(current, base);
    const patch: JsonPatch = { op: 'replace', path: '/properties/field' };

    expect(enricher.enrich(patch)).toMatchSnapshot();
  });

  it('skips defaultChange for array replace when only metadata changes', () => {
    const { base, current } = treePair(
      objRoot([arr('items', str('', { id: 'item' }))]),
      objRoot([arr('items', str('', { id: 'item' }), { description: 'Updated' })]),
    );

    const enricher = new PatchEnricher(current, base);
    const patch: JsonPatch = { op: 'replace', path: '/properties/items' };

    expect(enricher.enrich(patch)).toMatchSnapshot();
  });
});

describe('PatchEnricher move patch enrichment', () => {
  it('marks as rename when parent is same', () => {
    const { base, current } = treePair(
      objRoot([str('oldName', { id: 'field-id' })]),
      objRoot([str('newName', { id: 'field-id' })]),
    );

    const enricher = new PatchEnricher(current, base);
    const patch: JsonPatch = {
      op: 'move',
      from: '/properties/oldName',
      path: '/properties/newName',
    };

    expect(enricher.enrich(patch)).toMatchSnapshot();
  });

  it('does not mark as rename when parent differs', () => {
    const { base, current } = treePair(
      objRoot([
        obj('source', [str('field', { id: 'field-id' })]),
        obj('target', []),
      ]),
      objRoot([
        obj('source', []),
        obj('target', [str('field', { id: 'field-id' })]),
      ]),
    );

    const enricher = new PatchEnricher(current, base);
    const patch: JsonPatch = {
      op: 'move',
      from: '/properties/source/properties/field',
      path: '/properties/target/properties/field',
    };

    expect(enricher.enrich(patch)).toMatchSnapshot();
  });

  it('detects formula change on move', () => {
    const { base, current } = treePair(
      objRoot([num('oldName', { id: 'field-id', formula: { version: 1, expression: 'value * 2' } })]),
      objRoot([num('newName', { id: 'field-id', formula: { version: 1, expression: 'value * 3' } })]),
    );

    const enricher = new PatchEnricher(current, base);
    const patch: JsonPatch = {
      op: 'move',
      from: '/properties/oldName',
      path: '/properties/newName',
    };

    expect(enricher.enrich(patch)).toMatchSnapshot();
  });
});
