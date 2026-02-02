import { describe, it, expect } from '@jest/globals';
import { NULL_NODE, EMPTY_METADATA } from '../index.js';
import { createMockFormula } from './test-helpers.js';

describe('NULL_NODE', () => {
  it('has null type', () => {
    expect(NULL_NODE.nodeType()).toBe('null');
  });

  it('isNull returns true', () => {
    expect(NULL_NODE.isNull()).toBe(true);
    expect(NULL_NODE.isObject()).toBe(false);
    expect(NULL_NODE.isArray()).toBe(false);
    expect(NULL_NODE.isPrimitive()).toBe(false);
    expect(NULL_NODE.isRef()).toBe(false);
  });

  it('id returns empty string', () => {
    expect(NULL_NODE.id()).toBe('');
  });

  it('name returns empty string', () => {
    expect(NULL_NODE.name()).toBe('');
  });

  it('property returns itself', () => {
    expect(NULL_NODE.property('any')).toBe(NULL_NODE);
  });

  it('properties returns empty array', () => {
    expect(NULL_NODE.properties()).toHaveLength(0);
  });

  it('items returns itself', () => {
    expect(NULL_NODE.items()).toBe(NULL_NODE);
  });

  it('clone returns itself', () => {
    expect(NULL_NODE.clone()).toBe(NULL_NODE);
  });

  it('returns undefined for primitive properties', () => {
    expect(NULL_NODE.ref()).toBeUndefined();
    expect(NULL_NODE.formula()).toBeUndefined();
    expect(NULL_NODE.hasFormula()).toBe(false);
    expect(NULL_NODE.defaultValue()).toBeUndefined();
    expect(NULL_NODE.foreignKey()).toBeUndefined();
  });

  it('returns EMPTY_METADATA', () => {
    expect(NULL_NODE.metadata()).toBe(EMPTY_METADATA);
  });

  describe('mutations are no-ops', () => {
    it('setName does nothing', () => {
      NULL_NODE.setName('test');
      expect(NULL_NODE.name()).toBe('');
    });

    it('setMetadata does nothing', () => {
      NULL_NODE.setMetadata({ description: 'test' });
      expect(NULL_NODE.metadata()).toBe(EMPTY_METADATA);
    });

    it('addChild does nothing', () => {
      NULL_NODE.addChild(NULL_NODE);
      expect(NULL_NODE.properties()).toHaveLength(0);
    });

    it('removeChild returns false', () => {
      expect(NULL_NODE.removeChild('any')).toBe(false);
    });

    it('setItems does nothing', () => {
      NULL_NODE.setItems(NULL_NODE);
      expect(NULL_NODE.items()).toBe(NULL_NODE);
    });

    it('setDefaultValue does nothing', () => {
      NULL_NODE.setDefaultValue('test');
      expect(NULL_NODE.defaultValue()).toBeUndefined();
    });

    it('setFormula does nothing', () => {
      NULL_NODE.setFormula(createMockFormula(1, 'test'));
      expect(NULL_NODE.formula()).toBeUndefined();
    });

    it('setForeignKey does nothing', () => {
      NULL_NODE.setForeignKey('users');
      expect(NULL_NODE.foreignKey()).toBeUndefined();
    });
  });
});
