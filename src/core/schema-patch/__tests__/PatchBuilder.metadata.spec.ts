import { describe, it, expect } from '@jest/globals';
import {
  builder,
  treePair,
  objRoot,
  str,
  num,
} from './test-helpers.js';

describe('PatchBuilder SchemaPatch metadata', () => {
  it('detects type change from string to number', () => {
    const { base, current } = treePair(
      objRoot([str('field', { id: 'old-field' })]),
      objRoot([num('field', { id: 'new-field' })]),
    );

    current.trackReplacement('old-field', 'new-field');

    const patches = builder.build(current, base);

    expect(patches).toMatchSnapshot();
  });

  it('detects formula addition', () => {
    const { base, current } = treePair(
      objRoot([num('field')]),
      objRoot([num('field', { formula: { version: 1, expression: 'value * 2' } })]),
    );

    const patches = builder.build(current, base);

    expect(patches).toMatchSnapshot();
  });

  it('detects formula removal', () => {
    const { base, current } = treePair(
      objRoot([num('computed', { formula: { version: 1, expression: 'value * 2' } })]),
      objRoot([num('computed')]),
    );

    const patches = builder.build(current, base);

    expect(patches).toMatchSnapshot();
  });

  it('detects default value change', () => {
    const { base, current } = treePair(
      objRoot([str('field', { default: 'initial' })]),
      objRoot([str('field', { default: 'modified' })]),
    );

    const patches = builder.build(current, base);

    expect(patches).toMatchSnapshot();
  });

  it('detects description change', () => {
    const { base, current } = treePair(
      objRoot([str('field', { description: 'old description' })]),
      objRoot([str('field', { description: 'new description' })]),
    );

    const patches = builder.build(current, base);

    expect(patches).toMatchSnapshot();
  });

  it('detects deprecated change', () => {
    const { base, current } = treePair(
      objRoot([str('field')]),
      objRoot([str('field', { deprecated: true })]),
    );

    const patches = builder.build(current, base);

    expect(patches).toMatchSnapshot();
  });

  it('detects foreignKey addition', () => {
    const { base, current } = treePair(
      objRoot([str('field')]),
      objRoot([str('field', { foreignKey: 'users' })]),
    );

    const patches = builder.build(current, base);

    expect(patches).toMatchSnapshot();
  });

  it('detects foreignKey change', () => {
    const { base, current } = treePair(
      objRoot([str('field', { foreignKey: 'users' })]),
      objRoot([str('field', { foreignKey: 'categories' })]),
    );

    const patches = builder.build(current, base);

    expect(patches).toMatchSnapshot();
  });

  it('detects foreignKey removal', () => {
    const { base, current } = treePair(
      objRoot([str('field', { foreignKey: 'users' })]),
      objRoot([str('field')]),
    );

    const patches = builder.build(current, base);

    expect(patches).toMatchSnapshot();
  });

  it('marks move as rename when parent is same', () => {
    const { base, current } = treePair(
      objRoot([str('oldName', { id: 'field-id' })]),
      objRoot([str('newName', { id: 'field-id' })]),
    );

    const patches = builder.build(current, base);

    expect(patches).toMatchSnapshot();
  });
});

describe('PatchBuilder add patch metadata', () => {
  it('includes formula in add patch when field has formula', () => {
    const { base, current } = treePair(
      objRoot([num('value')]),
      objRoot([num('value'), num('computed', { formula: { version: 1, expression: 'value * 2' } })]),
    );

    const patches = builder.build(current, base);

    expect(patches).toMatchSnapshot();
  });

  it('includes description in add patch when field has description', () => {
    const { base, current } = treePair(
      objRoot([]),
      objRoot([str('field', { description: 'My description' })]),
    );

    const patches = builder.build(current, base);

    expect(patches).toMatchSnapshot();
  });

  it('includes deprecated in add patch when field is deprecated', () => {
    const { base, current } = treePair(
      objRoot([]),
      objRoot([str('field', { deprecated: true })]),
    );

    const patches = builder.build(current, base);

    expect(patches).toMatchSnapshot();
  });

  it('includes default value in add patch when not standard', () => {
    const { base, current } = treePair(
      objRoot([]),
      objRoot([str('field', { default: 'my default' })]),
    );

    const patches = builder.build(current, base);

    expect(patches).toMatchSnapshot();
  });

  it('includes foreignKey in add patch when field has foreignKey', () => {
    const { base, current } = treePair(
      objRoot([]),
      objRoot([str('categoryId', { foreignKey: 'categories' })]),
    );

    const patches = builder.build(current, base);

    expect(patches).toMatchSnapshot();
  });
});
