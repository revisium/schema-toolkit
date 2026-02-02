import { describe, it, expect } from '@jest/globals';
import { PatchGenerator } from '../PatchGenerator.js';
import {
  treePair,
  objRoot,
  obj,
  arr,
  str,
  num,
  changes,
} from './test-helpers.js';

describe('PatchGenerator', () => {
  describe('generate add patches', () => {
    it('generates add patch for new field', () => {
      const { base, current } = treePair(
        objRoot([str('existing')]),
        objRoot([str('existing'), str('newField')]),
      );

      const generator = new PatchGenerator(current, base);
      const patches = generator.generate(
        changes({ added: [current.root().properties()[1]] }),
      );

      expect(patches).toMatchSnapshot();
    });

    it('generates add patch for nested field', () => {
      const { base, current } = treePair(
        objRoot([obj('nested', [])]),
        objRoot([obj('nested', [str('newField')])]),
      );

      const generator = new PatchGenerator(current, base);
      const patches = generator.generate(
        changes({ added: [current.root().properties()[0]?.properties()[0]] }),
      );

      expect(patches).toMatchSnapshot();
    });
  });

  describe('generate remove patches', () => {
    it('generates remove patch for deleted field', () => {
      const { base, current } = treePair(
        objRoot([str('name'), num('age')]),
        objRoot([str('name')]),
      );

      const generator = new PatchGenerator(current, base);
      const patches = generator.generate(
        changes({ removed: [base.root().properties()[1]] }),
      );

      expect(patches).toMatchSnapshot();
    });
  });

  describe('generate move patches', () => {
    it('generates move patch for renamed field', () => {
      const { base, current } = treePair(
        objRoot([str('oldName', { id: 'field-id' })]),
        objRoot([str('newName', { id: 'field-id' })]),
      );

      const generator = new PatchGenerator(current, base);
      const patches = generator.generate(
        changes({
          moved: [[base.root().properties()[0], current.root().properties()[0]]],
        }),
      );

      expect(patches).toMatchSnapshot();
    });

    it('generates move then replace for rename with modification', () => {
      const { base, current } = treePair(
        objRoot([str('oldName', { id: 'field-id', default: 'old' })]),
        objRoot([str('newName', { id: 'field-id', default: 'new' })]),
      );

      const generator = new PatchGenerator(current, base);
      const patches = generator.generate(
        changes({
          moved: [[base.root().properties()[0], current.root().properties()[0]]],
        }),
      );

      expect(patches).toMatchSnapshot();
    });
  });

  describe('generate replace patches', () => {
    it('generates replace patch for modified field', () => {
      const { base, current } = treePair(
        objRoot([str('name', { default: 'old' })]),
        objRoot([str('name', { default: 'new' })]),
      );

      const generator = new PatchGenerator(current, base);
      const patches = generator.generate(
        changes({
          modified: [[base.root().properties()[0], current.root().properties()[0]]],
        }),
      );

      expect(patches).toMatchSnapshot();
    });

    it('skips replace when only children changed', () => {
      const { base, current } = treePair(
        objRoot([obj('nested', [str('child', { default: 'old' })])]),
        objRoot([obj('nested', [str('child', { default: 'new' })])]),
      );

      const generator = new PatchGenerator(current, base);
      const patches = generator.generate(
        changes({
          modified: [
            [base.root().properties()[0], current.root().properties()[0]],
            [
              base.root().properties()[0]?.properties()[0],
              current.root().properties()[0]?.properties()[0],
            ],
          ],
        }),
      );

      expect(patches).toMatchSnapshot();
    });
  });

  describe('patch ordering', () => {
    it('orders patches: prerequisite adds -> moves -> replaces -> regular adds -> removes', () => {
      const { base, current } = treePair(
        objRoot([str('fieldA', { id: 'fieldA-id' }), str('toRemove')]),
        objRoot([str('renamedA', { id: 'fieldA-id' }), obj('target', []), str('newField')]),
      );

      const generator = new PatchGenerator(current, base);
      const patches = generator.generate(
        changes({
          moved: [[base.root().properties()[0], current.root().properties()[0]]],
          added: [current.root().properties()[1], current.root().properties()[2]],
          removed: [base.root().properties()[1]],
        }),
      );

      expect(patches).toMatchSnapshot();
    });
  });

  describe('array patches', () => {
    it('generates add patch for field in array items', () => {
      const { base, current } = treePair(
        objRoot([arr('items', obj('', [str('existing')], { id: 'items-id' }))]),
        objRoot([arr('items', obj('', [str('existing'), str('newField')], { id: 'items-id' }))]),
      );

      const generator = new PatchGenerator(current, base);
      const patches = generator.generate(
        changes({
          added: [current.root().properties()[0]?.items().properties()[1]],
        }),
      );

      expect(patches).toMatchSnapshot();
    });

    it('generates replace patch when array items type changes', () => {
      const { base, current } = treePair(
        objRoot([arr('items', str('', { id: 'old-items' }))]),
        objRoot([arr('items', num('', { id: 'new-items' }))]),
      );

      current.trackReplacement('old-items', 'new-items');

      const generator = new PatchGenerator(current, base);
      const patches = generator.generate(
        changes({
          modified: [
            [base.root().properties()[0]?.items(), current.root().properties()[0]?.items()],
          ],
        }),
      );

      expect(patches).toMatchSnapshot();
    });

    it('generates separate patches for array metadata and items changes', () => {
      const { base, current } = treePair(
        objRoot([arr('items', str('', { id: 'old-items' }))]),
        objRoot([arr('items', num('', { id: 'new-items' }), { description: 'Updated' })]),
      );

      current.trackReplacement('old-items', 'new-items');

      const generator = new PatchGenerator(current, base);
      const patches = generator.generate(
        changes({
          modified: [
            [base.root().properties()[0], current.root().properties()[0]],
            [base.root().properties()[0]?.items(), current.root().properties()[0]?.items()],
          ],
        }),
      );

      expect(patches).toMatchSnapshot();
    });
  });

  describe('prerequisite adds', () => {
    it('orders add before move when adding parent of move destination', () => {
      const { base, current } = treePair(
        objRoot([str('field', { id: 'field-id' })]),
        objRoot([obj('target', [str('field', { id: 'field-id' })])]),
      );

      const generator = new PatchGenerator(current, base);
      const patches = generator.generate(
        changes({
          moved: [[base.root().properties()[0], current.root().properties()[0]?.properties()[0]]],
          added: [current.root().properties()[0]],
        }),
      );

      expect(patches).toMatchSnapshot();
    });
  });
});
