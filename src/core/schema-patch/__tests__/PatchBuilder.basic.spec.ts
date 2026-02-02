import { describe, it, expect } from '@jest/globals';
import {
  builder,
  treePair,
  objRoot,
  obj,
  str,
  num,
} from './test-helpers.js';

describe('PatchBuilder basic operations', () => {
  describe('no changes', () => {
    it('returns empty array when trees are identical', () => {
      const { base, current } = treePair(
        objRoot([str('name', { default: 'test' })]),
        objRoot([str('name', { default: 'test' })]),
      );

      const patches = builder.build(current, base);

      expect(patches).toMatchSnapshot();
    });
  });

  describe('adding top-level field', () => {
    it('generates add patch for new top-level field', () => {
      const { base, current } = treePair(
        objRoot([str('existing')]),
        objRoot([str('existing'), str('newField')]),
      );

      const patches = builder.build(current, base);

      expect(patches).toMatchSnapshot();
    });
  });

  describe('adding nested field', () => {
    it('generates add patch for new nested field', () => {
      const { base, current } = treePair(
        objRoot([obj('nested', [str('te')])]),
        objRoot([obj('nested', [str('te'), str('new')])]),
      );

      const patches = builder.build(current, base);

      expect(patches).toMatchSnapshot();
    });
  });

  describe('modifying field', () => {
    it('generates replace patch when default value changes', () => {
      const { base, current } = treePair(
        objRoot([str('name', { default: 'initial' })]),
        objRoot([str('name', { default: 'modified' })]),
      );

      const patches = builder.build(current, base);

      expect(patches).toMatchSnapshot();
    });
  });

  describe('removing field', () => {
    it('generates remove patch when top-level field is deleted', () => {
      const { base, current } = treePair(
        objRoot([str('name'), num('age')]),
        objRoot([num('age')]),
      );

      const patches = builder.build(current, base);

      expect(patches).toMatchSnapshot();
    });

    it('generates remove patch when nested field is deleted', () => {
      const { base, current } = treePair(
        objRoot([obj('nested', [str('fieldA'), str('fieldB')])]),
        objRoot([obj('nested', [str('fieldB')])]),
      );

      const patches = builder.build(current, base);

      expect(patches).toMatchSnapshot();
    });
  });

  describe('renaming field', () => {
    it('generates move patch when field is renamed', () => {
      const { base, current } = treePair(
        objRoot([str('oldName', { id: 'field-id' })]),
        objRoot([str('newName', { id: 'field-id' })]),
      );

      const patches = builder.build(current, base);

      expect(patches).toMatchSnapshot();
    });
  });
});
