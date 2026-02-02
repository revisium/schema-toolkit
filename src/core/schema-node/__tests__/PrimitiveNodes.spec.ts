import { describe, it, expect } from '@jest/globals';
import {
  createStringNode,
  createNumberNode,
  createBooleanNode,
  NULL_NODE,
  EMPTY_METADATA,
} from '../index.js';
import { createMockFormula } from './test-helpers.js';

describe('StringNode', () => {
  it('creates node with id and name', () => {
    const node = createStringNode('str-1', 'name');

    expect(node.id()).toBe('str-1');
    expect(node.name()).toBe('name');
    expect(node.nodeType()).toBe('string');
  });

  it('isPrimitive returns true', () => {
    const node = createStringNode('str-1', 'name');

    expect(node.isObject()).toBe(false);
    expect(node.isArray()).toBe(false);
    expect(node.isPrimitive()).toBe(true);
    expect(node.isRef()).toBe(false);
    expect(node.isNull()).toBe(false);
  });

  it('supports default value', () => {
    const node = createStringNode('str-1', 'name', { defaultValue: 'John' });

    expect(node.defaultValue()).toBe('John');
  });

  it('supports foreign key', () => {
    const node = createStringNode('str-1', 'userId', { foreignKey: 'users' });

    expect(node.foreignKey()).toBe('users');
  });

  it('supports formula', () => {
    const formula = createMockFormula(1, 'firstName + lastName');
    const node = createStringNode('str-1', 'fullName', { formula });

    expect(node.formula()).toBe(formula);
    expect(node.hasFormula()).toBe(true);
  });

  it('hasFormula returns false when no formula', () => {
    const node = createStringNode('str-1', 'name');

    expect(node.hasFormula()).toBe(false);
  });

  it('properties returns empty array', () => {
    const node = createStringNode('str-1', 'name');

    expect(node.properties()).toHaveLength(0);
  });

  it('property returns NULL_NODE', () => {
    const node = createStringNode('str-1', 'name');

    expect(node.property('any')).toBe(NULL_NODE);
  });

  it('items returns NULL_NODE', () => {
    const node = createStringNode('str-1', 'name');

    expect(node.items()).toBe(NULL_NODE);
  });

  it('clones with all options', () => {
    const formula = createMockFormula(1, 'a + b');
    const node = createStringNode('str-1', 'name', {
      defaultValue: 'test',
      foreignKey: 'users',
      formula,
    });

    const cloned = node.clone();

    expect(cloned.id()).toBe('str-1');
    expect(cloned.defaultValue()).toBe('test');
    expect(cloned.foreignKey()).toBe('users');
    expect(cloned.formula()).toBe(formula);
  });

  it('ref returns undefined', () => {
    const node = createStringNode('str-1', 'name');

    expect(node.ref()).toBeUndefined();
  });

  it('returns EMPTY_METADATA when no metadata provided', () => {
    const node = createStringNode('str-1', 'name');

    expect(node.metadata()).toBe(EMPTY_METADATA);
  });

  it('supports metadata', () => {
    const node = createStringNode('str-1', 'name', {
      metadata: { title: 'Name', deprecated: true },
    });

    expect(node.metadata().title).toBe('Name');
    expect(node.metadata().deprecated).toBe(true);
  });

  it('creates node with empty options', () => {
    const node = createStringNode('str-1', 'name', {});

    expect(node.defaultValue()).toBeUndefined();
    expect(node.foreignKey()).toBeUndefined();
    expect(node.formula()).toBeUndefined();
  });
});

describe('NumberNode', () => {
  it('creates node with id and name', () => {
    const node = createNumberNode('num-1', 'age');

    expect(node.id()).toBe('num-1');
    expect(node.name()).toBe('age');
    expect(node.nodeType()).toBe('number');
  });

  it('isPrimitive returns true', () => {
    const node = createNumberNode('num-1', 'age');

    expect(node.isPrimitive()).toBe(true);
  });

  it('supports default value', () => {
    const node = createNumberNode('num-1', 'age', { defaultValue: 25 });

    expect(node.defaultValue()).toBe(25);
  });

  it('supports formula', () => {
    const formula = createMockFormula(1, 'price * quantity');
    const node = createNumberNode('num-1', 'total', { formula });

    expect(node.formula()).toBe(formula);
    expect(node.hasFormula()).toBe(true);
  });

  it('clones with options', () => {
    const node = createNumberNode('num-1', 'age', { defaultValue: 25 });

    const cloned = node.clone();

    expect(cloned.id()).toBe('num-1');
    expect(cloned.defaultValue()).toBe(25);
  });

  it('type predicates return correct values', () => {
    const node = createNumberNode('num-1', 'age');

    expect(node.isObject()).toBe(false);
    expect(node.isArray()).toBe(false);
    expect(node.isPrimitive()).toBe(true);
    expect(node.isRef()).toBe(false);
    expect(node.isNull()).toBe(false);
  });

  it('container methods return empty/NULL_NODE', () => {
    const node = createNumberNode('num-1', 'age');

    expect(node.property('any')).toBe(NULL_NODE);
    expect(node.properties()).toHaveLength(0);
    expect(node.items()).toBe(NULL_NODE);
  });

  it('ref and foreignKey return undefined', () => {
    const node = createNumberNode('num-1', 'age');

    expect(node.ref()).toBeUndefined();
    expect(node.foreignKey()).toBeUndefined();
  });

  it('hasFormula returns false when no formula', () => {
    const node = createNumberNode('num-1', 'age');

    expect(node.hasFormula()).toBe(false);
    expect(node.formula()).toBeUndefined();
  });

  it('returns EMPTY_METADATA when no metadata provided', () => {
    const node = createNumberNode('num-1', 'age');

    expect(node.metadata()).toBe(EMPTY_METADATA);
  });

  it('supports metadata', () => {
    const node = createNumberNode('num-1', 'age', {
      metadata: { title: 'Age', description: 'User age' },
    });

    expect(node.metadata().title).toBe('Age');
    expect(node.metadata().description).toBe('User age');
  });

  it('creates node with empty options', () => {
    const node = createNumberNode('num-1', 'age', {});

    expect(node.defaultValue()).toBeUndefined();
    expect(node.formula()).toBeUndefined();
  });
});

describe('BooleanNode', () => {
  it('creates node with id and name', () => {
    const node = createBooleanNode('bool-1', 'active');

    expect(node.id()).toBe('bool-1');
    expect(node.name()).toBe('active');
    expect(node.nodeType()).toBe('boolean');
  });

  it('isPrimitive returns true', () => {
    const node = createBooleanNode('bool-1', 'active');

    expect(node.isPrimitive()).toBe(true);
  });

  it('supports default value', () => {
    const node = createBooleanNode('bool-1', 'active', { defaultValue: true });

    expect(node.defaultValue()).toBe(true);
  });

  it('supports formula', () => {
    const formula = createMockFormula(1, 'age >= 18');
    const node = createBooleanNode('bool-1', 'isAdult', { formula });

    expect(node.formula()).toBe(formula);
    expect(node.hasFormula()).toBe(true);
  });

  it('clones with options', () => {
    const node = createBooleanNode('bool-1', 'active', { defaultValue: false });

    const cloned = node.clone();

    expect(cloned.id()).toBe('bool-1');
    expect(cloned.defaultValue()).toBe(false);
  });

  it('type predicates return correct values', () => {
    const node = createBooleanNode('bool-1', 'active');

    expect(node.isObject()).toBe(false);
    expect(node.isArray()).toBe(false);
    expect(node.isPrimitive()).toBe(true);
    expect(node.isRef()).toBe(false);
    expect(node.isNull()).toBe(false);
  });

  it('container methods return empty/NULL_NODE', () => {
    const node = createBooleanNode('bool-1', 'active');

    expect(node.property('any')).toBe(NULL_NODE);
    expect(node.properties()).toHaveLength(0);
    expect(node.items()).toBe(NULL_NODE);
  });

  it('ref and foreignKey return undefined', () => {
    const node = createBooleanNode('bool-1', 'active');

    expect(node.ref()).toBeUndefined();
    expect(node.foreignKey()).toBeUndefined();
  });

  it('hasFormula returns false when no formula', () => {
    const node = createBooleanNode('bool-1', 'active');

    expect(node.hasFormula()).toBe(false);
    expect(node.formula()).toBeUndefined();
  });

  it('returns EMPTY_METADATA when no metadata provided', () => {
    const node = createBooleanNode('bool-1', 'active');

    expect(node.metadata()).toBe(EMPTY_METADATA);
  });

  it('supports metadata', () => {
    const node = createBooleanNode('bool-1', 'active', {
      metadata: { title: 'Active', deprecated: true },
    });

    expect(node.metadata().title).toBe('Active');
    expect(node.metadata().deprecated).toBe(true);
  });

  it('creates node with empty options', () => {
    const node = createBooleanNode('bool-1', 'active', {});

    expect(node.defaultValue()).toBeUndefined();
    expect(node.formula()).toBeUndefined();
  });
});

describe('PrimitiveNode mutations', () => {
  it('setName changes the name', () => {
    const node = createStringNode('str-1', 'oldName');

    node.setName('newName');

    expect(node.name()).toBe('newName');
  });

  it('setMetadata changes metadata', () => {
    const node = createStringNode('str-1', 'name');

    node.setMetadata({ description: 'Updated' });

    expect(node.metadata().description).toBe('Updated');
  });

  it('setDefaultValue changes default value', () => {
    const node = createStringNode('str-1', 'name', { defaultValue: 'old' });

    node.setDefaultValue('new');

    expect(node.defaultValue()).toBe('new');
  });

  it('setFormula changes formula', () => {
    const node = createStringNode('str-1', 'name');
    const formula = createMockFormula(1, 'a + b');

    node.setFormula(formula);

    expect(node.formula()).toBe(formula);
    expect(node.hasFormula()).toBe(true);
  });

  it('setFormula with undefined removes formula', () => {
    const formula = createMockFormula(1, 'a + b');
    const node = createStringNode('str-1', 'name', { formula });

    node.setFormula(undefined);

    expect(node.formula()).toBeUndefined();
    expect(node.hasFormula()).toBe(false);
  });

  it('setForeignKey changes foreign key', () => {
    const node = createStringNode('str-1', 'userId');

    node.setForeignKey('users');

    expect(node.foreignKey()).toBe('users');
  });

  it('setForeignKey with undefined removes foreign key', () => {
    const node = createStringNode('str-1', 'userId', { foreignKey: 'users' });

    node.setForeignKey(undefined);

    expect(node.foreignKey()).toBeUndefined();
  });

  it('addChild is no-op for primitive', () => {
    const node = createStringNode('str-1', 'name');
    const child = createStringNode('str-2', 'child');

    node.addChild(child);

    expect(node.properties()).toHaveLength(0);
  });

  it('removeChild returns false for primitive', () => {
    const node = createStringNode('str-1', 'name');

    const result = node.removeChild('any');

    expect(result).toBe(false);
  });

  it('setItems is no-op for primitive', () => {
    const node = createStringNode('str-1', 'name');
    const items = createStringNode('str-2', '');

    node.setItems(items);

    expect(node.items()).toBe(NULL_NODE);
  });
});
