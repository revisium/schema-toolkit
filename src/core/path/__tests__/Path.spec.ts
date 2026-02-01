import { describe, it, expect } from '@jest/globals';
import { EMPTY_PATH } from '../Path';
import { jsonPointerToPath } from '../PathParser';

describe('Path', () => {
  describe('EMPTY_PATH', () => {
    it('has no segments', () => {
      expect(EMPTY_PATH.segments()).toEqual([]);
    });

    it('is empty', () => {
      expect(EMPTY_PATH.isEmpty()).toBe(true);
    });

    it('has zero length', () => {
      expect(EMPTY_PATH.length()).toBe(0);
    });

    it('returns empty json pointer', () => {
      expect(EMPTY_PATH.asJsonPointer()).toBe('');
    });

    it('returns empty simple path', () => {
      expect(EMPTY_PATH.asSimple()).toBe('');
    });

    it('equals another empty path', () => {
      expect(EMPTY_PATH.equals(EMPTY_PATH)).toBe(true);
    });

    it('is not child of itself', () => {
      expect(EMPTY_PATH.isChildOf(EMPTY_PATH)).toBe(false);
    });

    it('parent returns empty path', () => {
      expect(EMPTY_PATH.parent().isEmpty()).toBe(true);
    });

    it('childItems creates items path for array root', () => {
      const itemsPath = EMPTY_PATH.childItems();
      expect(itemsPath.asJsonPointer()).toBe('/items');
      expect(itemsPath.isEmpty()).toBe(false);
    });
  });

  describe('child', () => {
    it('creates property path from empty', () => {
      const path = EMPTY_PATH.child('name');

      expect(path.isEmpty()).toBe(false);
      expect(path.length()).toBe(1);
      expect(path.segments()[0]?.isProperty()).toBe(true);
      expect(path.segments()[0]?.propertyName()).toBe('name');
    });

    it('creates nested path', () => {
      const path = EMPTY_PATH.child('user').child('name');

      expect(path.length()).toBe(2);
      expect(path.segments()[0]?.propertyName()).toBe('user');
      expect(path.segments()[1]?.propertyName()).toBe('name');
    });
  });

  describe('childItems', () => {
    it('adds items segment after property', () => {
      const path = EMPTY_PATH.child('items').childItems();

      expect(path.length()).toBe(2);
      expect(path.segments()[0]?.isProperty()).toBe(true);
      expect(path.segments()[1]?.isItems()).toBe(true);
    });
  });

  describe('parent', () => {
    it('returns empty for single-segment path', () => {
      const path = EMPTY_PATH.child('name');
      expect(path.parent().isEmpty()).toBe(true);
    });

    it('returns parent for nested path', () => {
      const path = EMPTY_PATH.child('user').child('name');
      const parent = path.parent();

      expect(parent.length()).toBe(1);
      expect(parent.segments()[0]?.propertyName()).toBe('user');
    });
  });

  describe('asJsonPointer', () => {
    it('converts property path', () => {
      const path = EMPTY_PATH.child('name');
      expect(path.asJsonPointer()).toBe('/properties/name');
    });

    it('converts nested path', () => {
      const path = EMPTY_PATH.child('user').child('name');
      expect(path.asJsonPointer()).toBe('/properties/user/properties/name');
    });

    it('converts path with items', () => {
      const path = EMPTY_PATH.child('items').childItems().child('name');
      expect(path.asJsonPointer()).toBe(
        '/properties/items/items/properties/name',
      );
    });
  });

  describe('asSimple', () => {
    it('converts property path', () => {
      const path = EMPTY_PATH.child('name');
      expect(path.asSimple()).toBe('name');
    });

    it('converts nested path with dot', () => {
      const path = EMPTY_PATH.child('user').child('name');
      expect(path.asSimple()).toBe('user.name');
    });

    it('converts array path with wildcard', () => {
      const path = EMPTY_PATH.child('items').childItems().child('name');
      expect(path.asSimple()).toBe('items[*].name');
    });
  });

  describe('equals', () => {
    it('returns true for equal paths', () => {
      const a = EMPTY_PATH.child('user').child('name');
      const b = EMPTY_PATH.child('user').child('name');
      expect(a.equals(b)).toBe(true);
    });

    it('returns false for different paths', () => {
      const a = EMPTY_PATH.child('user');
      const b = EMPTY_PATH.child('name');
      expect(a.equals(b)).toBe(false);
    });

    it('returns false for different lengths', () => {
      const a = EMPTY_PATH.child('user');
      const b = EMPTY_PATH.child('user').child('name');
      expect(a.equals(b)).toBe(false);
    });

    it('returns false when comparing property and items segments', () => {
      const a = EMPTY_PATH.child('arr').childItems();
      const b = EMPTY_PATH.child('arr').child('x');
      expect(a.equals(b)).toBe(false);
    });
  });

  describe('isChildOf', () => {
    it('returns true for direct child', () => {
      const parent = EMPTY_PATH.child('user');
      const child = EMPTY_PATH.child('user').child('name');
      expect(child.isChildOf(parent)).toBe(true);
    });

    it('returns true for deep child', () => {
      const parent = EMPTY_PATH.child('user');
      const child = EMPTY_PATH.child('user').child('profile').child('age');
      expect(child.isChildOf(parent)).toBe(true);
    });

    it('returns false for same path', () => {
      const path = EMPTY_PATH.child('user');
      expect(path.isChildOf(path)).toBe(false);
    });

    it('returns false for unrelated paths', () => {
      const a = EMPTY_PATH.child('user');
      const b = EMPTY_PATH.child('name');
      expect(a.isChildOf(b)).toBe(false);
    });

    it('returns false when child is shorter', () => {
      const parent = EMPTY_PATH.child('user').child('name');
      const child = EMPTY_PATH.child('user');
      expect(child.isChildOf(parent)).toBe(false);
    });

    it('returns false when prefix differs', () => {
      const parent = EMPTY_PATH.child('user').child('name');
      const child = EMPTY_PATH.child('other').child('name').child('x');
      expect(child.isChildOf(parent)).toBe(false);
    });
  });

  describe('roundtrip with jsonPointerToPath', () => {
    it('preserves path through json pointer conversion', () => {
      const pointer =
        '/properties/user/properties/profile/items/properties/name';
      const path = jsonPointerToPath(pointer);
      expect(path.asJsonPointer()).toBe(pointer);
    });
  });
});
