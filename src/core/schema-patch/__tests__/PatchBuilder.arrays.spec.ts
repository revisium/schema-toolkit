import { describe, it, expect } from '@jest/globals';
import {
  builder,
  treePair,
  objRoot,
  obj,
  arr,
  str,
  num,
} from './test-helpers.js';

describe('PatchBuilder array operations', () => {
  it('generates add patch for field inside array items', () => {
    const { base, current } = treePair(
      objRoot([arr('items', obj('', [str('existingField')], { id: 'items-id' }))]),
      objRoot([arr('items', obj('', [str('existingField'), str('newField')], { id: 'items-id' }))]),
    );

    const patches = builder.build(current, base);

    expect(patches).toMatchSnapshot();
  });

  it('generates remove patch for field inside array items', () => {
    const { base, current } = treePair(
      objRoot([arr('items', obj('', [str('fieldA'), str('fieldB')], { id: 'items-id' }))]),
      objRoot([arr('items', obj('', [str('fieldB')], { id: 'items-id' }))]),
    );

    const patches = builder.build(current, base);

    expect(patches).toMatchSnapshot();
  });

  it('generates replace patch for field inside array items', () => {
    const { base, current } = treePair(
      objRoot([arr('items', obj('', [str('name', { default: 'initial' })], { id: 'items-id' }))]),
      objRoot([arr('items', obj('', [str('name', { default: 'modified' })], { id: 'items-id' }))]),
    );

    const patches = builder.build(current, base);

    expect(patches).toMatchSnapshot();
  });

  it('generates move patch for renamed field inside array items', () => {
    const { base, current } = treePair(
      objRoot([arr('items', obj('', [str('oldName', { id: 'field-id' })], { id: 'items-id' }))]),
      objRoot([arr('items', obj('', [str('newName', { id: 'field-id' })], { id: 'items-id' }))]),
    );

    const patches = builder.build(current, base);

    expect(patches).toMatchSnapshot();
  });

  it('generates replace patch for items when array items type changes', () => {
    const { base, current } = treePair(
      objRoot([arr('items', str('', { id: 'items-id' }))]),
      objRoot([arr('items', num('', { id: 'new-items-id' }))]),
    );

    current.trackReplacement('items-id', 'new-items-id');

    const patches = builder.build(current, base);

    expect(patches).toMatchSnapshot();
  });

  it('generates replace patch for array when only array metadata changes', () => {
    const { base, current } = treePair(
      objRoot([arr('items', str('', { id: 'items-id' }))]),
      objRoot([arr('items', str('', { id: 'items-id' }), { description: 'New description' })]),
    );

    const patches = builder.build(current, base);

    expect(patches).toMatchSnapshot();
  });

  it('generates two patches when both array metadata and items type change', () => {
    const { base, current } = treePair(
      objRoot([arr('items', str('', { id: 'items-id' }))]),
      objRoot([arr('items', num('', { id: 'new-items-id' }), { description: 'New description' })]),
    );

    current.trackReplacement('items-id', 'new-items-id');

    const patches = builder.build(current, base);

    expect(patches).toMatchSnapshot();
  });
});
