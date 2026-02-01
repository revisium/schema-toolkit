import { describe, it, expect } from '@jest/globals';
import {
  builder,
  treePair,
  objRoot,
  arrRoot,
  strRoot,
  numRoot,
  boolRoot,
  obj,
  arr,
  str,
} from './test-helpers.js';

describe('PatchBuilder root changes', () => {
  describe('object root', () => {
    it('generates replace patch when root description changes', () => {
      const { base, current } = treePair(
        objRoot([str('name')]),
        objRoot([str('name')], { description: 'New root description' }),
      );

      const patches = builder.build(current, base);

      expect(patches).toMatchSnapshot();
    });

    it('generates replace patch when root deprecated changes', () => {
      const { base, current } = treePair(
        objRoot([str('name')]),
        objRoot([str('name')], { deprecated: true }),
      );

      const patches = builder.build(current, base);

      expect(patches).toMatchSnapshot();
    });
  });

  describe('primitive root', () => {
    it('string root - no changes', () => {
      const { base, current } = treePair(
        strRoot({ default: 'hello' }),
        strRoot({ default: 'hello' }),
      );

      const patches = builder.build(current, base);

      expect(patches).toMatchSnapshot();
    });

    it('string root - description change', () => {
      const { base, current } = treePair(
        strRoot({ default: 'hello' }),
        strRoot({ default: 'hello', description: 'A string value' }),
      );

      const patches = builder.build(current, base);

      expect(patches).toMatchSnapshot();
    });

    it('string root - default value change', () => {
      const { base, current } = treePair(
        strRoot({ default: 'old' }),
        strRoot({ default: 'new' }),
      );

      const patches = builder.build(current, base);

      expect(patches).toMatchSnapshot();
    });

    it('number root - default value change', () => {
      const { base, current } = treePair(
        numRoot({ default: 0 }),
        numRoot({ default: 42 }),
      );

      const patches = builder.build(current, base);

      expect(patches).toMatchSnapshot();
    });

    it('boolean root - deprecated change', () => {
      const { base, current } = treePair(
        boolRoot({ default: false }),
        boolRoot({ default: false, deprecated: true }),
      );

      const patches = builder.build(current, base);

      expect(patches).toMatchSnapshot();
    });
  });

  describe('array root', () => {
    it('array root with primitive items - no changes', () => {
      const { base, current } = treePair(
        arrRoot(str('', { id: 'items' })),
        arrRoot(str('', { id: 'items' })),
      );

      const patches = builder.build(current, base);

      expect(patches).toMatchSnapshot();
    });

    it('array root - description change on root', () => {
      const { base, current } = treePair(
        arrRoot(str('', { id: 'items' })),
        arrRoot(str('', { id: 'items' }), { description: 'Array of strings' }),
      );

      const patches = builder.build(current, base);

      expect(patches).toMatchSnapshot();
    });

    it('array root - items default value change', () => {
      const { base, current } = treePair(
        arrRoot(str('', { id: 'items', default: 'old' })),
        arrRoot(str('', { id: 'items', default: 'new' })),
      );

      const patches = builder.build(current, base);

      expect(patches).toMatchSnapshot();
    });

    it('array root with object items - add field to items', () => {
      const { base, current } = treePair(
        arrRoot(obj('', [str('existing')], { id: 'items' })),
        arrRoot(obj('', [str('existing'), str('new')], { id: 'items' })),
      );

      const patches = builder.build(current, base);

      expect(patches).toMatchSnapshot();
    });

    it('array root with object items - remove field from items', () => {
      const { base, current } = treePair(
        arrRoot(obj('', [str('fieldA'), str('fieldB')], { id: 'items' })),
        arrRoot(obj('', [str('fieldB')], { id: 'items' })),
      );

      const patches = builder.build(current, base);

      expect(patches).toMatchSnapshot();
    });

    it('array root with object items - rename field in items', () => {
      const { base, current } = treePair(
        arrRoot(obj('', [str('oldName', { id: 'field-id' })], { id: 'items' })),
        arrRoot(obj('', [str('newName', { id: 'field-id' })], { id: 'items' })),
      );

      const patches = builder.build(current, base);

      expect(patches).toMatchSnapshot();
    });
  });

  describe('nested arrays', () => {
    it('array of arrays - no changes', () => {
      const { base, current } = treePair(
        arrRoot(arr('', str('', { id: 'inner-items' }), { id: 'outer-items' })),
        arrRoot(arr('', str('', { id: 'inner-items' }), { id: 'outer-items' })),
      );

      const patches = builder.build(current, base);

      expect(patches).toMatchSnapshot();
    });

    it('array of arrays - inner items change', () => {
      const { base, current } = treePair(
        arrRoot(arr('', str('', { id: 'inner-items', default: 'old' }), { id: 'outer-items' })),
        arrRoot(arr('', str('', { id: 'inner-items', default: 'new' }), { id: 'outer-items' })),
      );

      const patches = builder.build(current, base);

      expect(patches).toMatchSnapshot();
    });

    it('array of arrays of objects - add field to innermost object', () => {
      const { base, current } = treePair(
        arrRoot(arr('', obj('', [str('existing')], { id: 'inner-obj' }), { id: 'outer-items' })),
        arrRoot(arr('', obj('', [str('existing'), str('new')], { id: 'inner-obj' }), { id: 'outer-items' })),
      );

      const patches = builder.build(current, base);

      expect(patches).toMatchSnapshot();
    });

    it('array of arrays of objects - remove field from innermost object', () => {
      const { base, current } = treePair(
        arrRoot(arr('', obj('', [str('fieldA'), str('fieldB')], { id: 'inner-obj' }), { id: 'outer-items' })),
        arrRoot(arr('', obj('', [str('fieldB')], { id: 'inner-obj' }), { id: 'outer-items' })),
      );

      const patches = builder.build(current, base);

      expect(patches).toMatchSnapshot();
    });

    it('array of arrays of objects - rename field in innermost object', () => {
      const { base, current } = treePair(
        arrRoot(arr('', obj('', [str('oldName', { id: 'field-id' })], { id: 'inner-obj' }), { id: 'outer-items' })),
        arrRoot(arr('', obj('', [str('newName', { id: 'field-id' })], { id: 'inner-obj' }), { id: 'outer-items' })),
      );

      const patches = builder.build(current, base);

      expect(patches).toMatchSnapshot();
    });
  });
});
