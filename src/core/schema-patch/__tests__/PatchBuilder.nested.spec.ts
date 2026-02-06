import { describe, it, expect } from '@jest/globals';
import {
  builder,
  treePair,
  objRoot,
  obj,
  str,
  num,
} from './test-helpers.js';

describe('PatchBuilder nested operations', () => {
  it('generates two move patches when parent and child are both renamed', () => {
    const { base, current } = treePair(
      objRoot([
        obj('oldParent', [str('oldChild', { id: 'child-id' })], {
          id: 'parent-id',
        }),
      ]),
      objRoot([
        obj('newParent', [str('newChild', { id: 'child-id' })], {
          id: 'parent-id',
        }),
      ]),
    );

    const patches = builder.build(current, base);

    const movePatches = patches.filter((p) => p.patch.op === 'move');
    const replacePatches = patches.filter((p) => p.patch.op === 'replace');

    expect(movePatches).toHaveLength(2);
    expect(replacePatches).toHaveLength(0);

    expect(patches).toMatchSnapshot();
  });


  it('generates moves and replaces when parent and child are both renamed with description added', () => {
    const { base, current } = treePair(
      objRoot([
        obj('oldParent', [str('oldChild', { id: 'child-id' })], {
          id: 'parent-id',
        }),
      ]),
      objRoot([
        obj(
          'newParent',
          [str('newChild', { id: 'child-id', description: 'child desc' })],
          { id: 'parent-id', description: 'parent desc' },
        ),
      ]),
    );

    const patches = builder.build(current, base);

    const movePatches = patches.filter((p) => p.patch.op === 'move');
    const replacePatches = patches.filter((p) => p.patch.op === 'replace');

    expect(movePatches).toHaveLength(2);
    expect(replacePatches).toHaveLength(2);
    expect(patches).toHaveLength(4);

    expect(patches).toMatchSnapshot();
  });

  it('generates replace patch for nested field modification', () => {
    const { base, current } = treePair(
      objRoot([obj('nested', [num('value', { default: 10 })])]),
      objRoot([obj('nested', [num('value', { default: 20 })])]),
    );

    const patches = builder.build(current, base);

    expect(patches).toMatchSnapshot();
  });

  it('generates move patch for renamed nested field', () => {
    const { base, current } = treePair(
      objRoot([obj('nested', [str('oldName', { id: 'field-id' })])]),
      objRoot([obj('nested', [str('newName', { id: 'field-id' })])]),
    );

    const patches = builder.build(current, base);

    expect(patches).toMatchSnapshot();
  });

  it('generates multiple patches for multiple changes in one object', () => {
    const { base, current } = treePair(
      objRoot([
        obj('nested', [
          str('fieldA', { default: 'a' }),
          str('fieldB', { default: 'b' }),
          str('fieldC', { default: 'c' }),
        ]),
      ]),
      objRoot([
        obj('nested', [
          str('fieldA', { default: 'modified' }),
          str('fieldC', { default: 'c' }),
          str('fieldD'),
        ]),
      ]),
    );

    const patches = builder.build(current, base);

    expect(patches).toMatchSnapshot();
  });
});
