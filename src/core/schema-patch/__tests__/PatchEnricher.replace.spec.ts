import { describe, it, expect } from '@jest/globals';
import { PatchEnricher } from '../PatchEnricher.js';
import {
  treePair,
  objRoot,
  obj,
  arr,
  str,
  num,
  ref,
  createMockFormula,
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
    const patch = { op: 'replace', path: '/properties/field' } as JsonPatch;

    expect(enricher.enrich(patch)).toMatchSnapshot();
  });

  it('detects array type with items', () => {
    const { base, current } = treePair(
      objRoot([str('field', { id: 'old-field' })]),
      objRoot([arr('field', num('', { id: 'items' }), { id: 'new-field' })]),
    );

    current.trackReplacement('old-field', 'new-field');

    const enricher = new PatchEnricher(current, base);
    const patch = { op: 'replace', path: '/properties/field' } as JsonPatch;

    expect(enricher.enrich(patch)).toMatchSnapshot();
  });

  it('detects formula addition', () => {
    const { base, current } = treePair(
      objRoot([num('field')]),
      objRoot([num('field', { formula: createMockFormula(1, 'value * 2') })]),
    );

    const enricher = new PatchEnricher(current, base);
    const patch = { op: 'replace', path: '/properties/field' } as JsonPatch;

    expect(enricher.enrich(patch)).toMatchSnapshot();
  });

  it('detects formula removal', () => {
    const { base, current } = treePair(
      objRoot([num('field', { formula: createMockFormula(1, 'value * 2') })]),
      objRoot([num('field')]),
    );

    const enricher = new PatchEnricher(current, base);
    const patch = { op: 'replace', path: '/properties/field' } as JsonPatch;

    expect(enricher.enrich(patch)).toMatchSnapshot();
  });

  it('detects formula change', () => {
    const { base, current } = treePair(
      objRoot([num('field', { formula: createMockFormula(1, 'value * 2') })]),
      objRoot([num('field', { formula: createMockFormula(1, 'value * 3') })]),
    );

    const enricher = new PatchEnricher(current, base);
    const patch = { op: 'replace', path: '/properties/field' } as JsonPatch;

    expect(enricher.enrich(patch)).toMatchSnapshot();
  });

  it('detects default value change', () => {
    const { base, current } = treePair(
      objRoot([str('field', { default: 'old' })]),
      objRoot([str('field', { default: 'new' })]),
    );

    const enricher = new PatchEnricher(current, base);
    const patch = { op: 'replace', path: '/properties/field' } as JsonPatch;

    expect(enricher.enrich(patch)).toMatchSnapshot();
  });

  it('detects description change', () => {
    const { base, current } = treePair(
      objRoot([str('field', { description: 'old' })]),
      objRoot([str('field', { description: 'new' })]),
    );

    const enricher = new PatchEnricher(current, base);
    const patch = { op: 'replace', path: '/properties/field' } as JsonPatch;

    expect(enricher.enrich(patch)).toMatchSnapshot();
  });

  it('detects deprecated change', () => {
    const { base, current } = treePair(
      objRoot([str('field')]),
      objRoot([str('field', { deprecated: true })]),
    );

    const enricher = new PatchEnricher(current, base);
    const patch = { op: 'replace', path: '/properties/field' } as JsonPatch;

    expect(enricher.enrich(patch)).toMatchSnapshot();
  });

  it('detects foreignKey change', () => {
    const { base, current } = treePair(
      objRoot([str('field', { foreignKey: 'users' })]),
      objRoot([str('field', { foreignKey: 'categories' })]),
    );

    const enricher = new PatchEnricher(current, base);
    const patch = { op: 'replace', path: '/properties/field' } as JsonPatch;

    expect(enricher.enrich(patch)).toMatchSnapshot();
  });

  it('skips defaultChange for array replace when only metadata changes', () => {
    const { base, current } = treePair(
      objRoot([arr('items', str('', { id: 'item' }))]),
      objRoot([arr('items', str('', { id: 'item' }), { description: 'Updated' })]),
    );

    const enricher = new PatchEnricher(current, base);
    const patch = { op: 'replace', path: '/properties/items' } as JsonPatch;

    expect(enricher.enrich(patch)).toMatchSnapshot();
  });

  it('detects ref change', () => {
    const { base, current } = treePair(
      objRoot([ref('avatar', 'File', { id: 'old-ref' })]),
      objRoot([ref('avatar', 'Markdown', { id: 'new-ref' })]),
    );

    current.trackReplacement('old-ref', 'new-ref');

    const enricher = new PatchEnricher(current, base);
    const patch = { op: 'replace', path: '/properties/avatar' } as JsonPatch;

    expect(enricher.enrich(patch)).toMatchSnapshot();
  });

  it('detects title change', () => {
    const { base, current } = treePair(
      objRoot([str('field', { id: 'field' })]),
      objRoot([str('field', { id: 'field' })]),
    );

    const baseNode = base.root().property('field');
    baseNode.setMetadata({ title: 'Old Title' });

    const currentNode = current.root().property('field');
    currentNode.setMetadata({ title: 'New Title' });

    const enricher = new PatchEnricher(current, base);
    const patch = { op: 'replace', path: '/properties/field' } as JsonPatch;

    expect(enricher.enrich(patch)).toMatchSnapshot();
  });

  it('includes only changed properties in propertyChanges', () => {
    const { base, current } = treePair(
      objRoot([str('field', { description: 'same', deprecated: false })]),
      objRoot([str('field', { description: 'same', deprecated: true })]),
    );

    const enricher = new PatchEnricher(current, base);
    const patch = { op: 'replace', path: '/properties/field' } as JsonPatch;

    const result = enricher.enrich(patch);
    const changedProperties = result.propertyChanges.map((c) => c.property);
    expect(changedProperties).toContain('deprecated');
    expect(changedProperties).not.toContain('description');
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
      objRoot([num('oldName', { id: 'field-id', formula: createMockFormula(1, 'value * 2') })]),
      objRoot([num('newName', { id: 'field-id', formula: createMockFormula(1, 'value * 3') })]),
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
