import { describe, it, expect } from '@jest/globals';
import { createValuePath } from '../../../core/value-path/ValuePath.js';
import { PropertySegment } from '../../../core/value-path/ValuePathSegment.js';
import { ChangeTracker } from '../ChangeTracker.js';

function path(name: string) {
  return createValuePath([new PropertySegment(name)]);
}

describe('ChangeTracker', () => {
  describe('initial state', () => {
    it('starts with no changes', () => {
      const tracker = new ChangeTracker();

      expect(tracker.hasChanges).toBe(false);
      expect(tracker.changes).toHaveLength(0);
    });
  });

  describe('track', () => {
    it('tracks a change', () => {
      const tracker = new ChangeTracker();

      tracker.track({
        type: 'setValue',
        path: path('name'),
        value: 'Jane',
        oldValue: 'John',
      });

      expect(tracker.hasChanges).toBe(true);
      expect(tracker.changes).toHaveLength(1);
    });

    it('accumulates multiple changes', () => {
      const tracker = new ChangeTracker();

      tracker.track({
        type: 'setValue',
        path: path('name'),
        value: 'Jane',
        oldValue: 'John',
      });
      tracker.track({
        type: 'setValue',
        path: path('age'),
        value: 30,
        oldValue: 25,
      });

      expect(tracker.changes).toHaveLength(2);
    });
  });

  describe('clear', () => {
    it('clears all changes', () => {
      const tracker = new ChangeTracker();
      tracker.track({
        type: 'setValue',
        path: path('name'),
        value: 'Jane',
        oldValue: 'John',
      });

      tracker.clear();

      expect(tracker.hasChanges).toBe(false);
      expect(tracker.changes).toHaveLength(0);
    });
  });

  describe('patches', () => {
    it('returns empty array when no changes', () => {
      const tracker = new ChangeTracker();

      expect(tracker.patches).toEqual([]);
    });

    it('generates replace patch for setValue', () => {
      const tracker = new ChangeTracker();
      tracker.track({
        type: 'setValue',
        path: path('name'),
        value: 'Jane',
        oldValue: 'John',
      });

      expect(tracker.patches).toEqual([
        { op: 'replace', path: '/name', value: 'Jane' },
      ]);
    });

    it('generates add patch for addProperty', () => {
      const tracker = new ChangeTracker();
      tracker.track({
        type: 'addProperty',
        path: path('email'),
        value: 'test@example.com',
      });

      expect(tracker.patches).toEqual([
        { op: 'add', path: '/email', value: 'test@example.com' },
      ]);
    });

    it('generates remove patch for removeProperty', () => {
      const tracker = new ChangeTracker();
      tracker.track({
        type: 'removeProperty',
        path: path('email'),
      });

      expect(tracker.patches).toEqual([
        { op: 'remove', path: '/email' },
      ]);
    });

    it('generates add patch with /- for arrayPush', () => {
      const tracker = new ChangeTracker();
      tracker.track({
        type: 'arrayPush',
        path: path('items'),
        value: { name: 'Item C' },
      });

      expect(tracker.patches).toEqual([
        { op: 'add', path: '/items/-', value: { name: 'Item C' } },
      ]);
    });

    it('generates add patch with index for arrayInsert', () => {
      const tracker = new ChangeTracker();
      tracker.track({
        type: 'arrayInsert',
        path: path('items'),
        index: 1,
        value: { name: 'Inserted' },
      });

      expect(tracker.patches).toEqual([
        { op: 'add', path: '/items/1', value: { name: 'Inserted' } },
      ]);
    });

    it('generates remove patch with index for arrayRemove', () => {
      const tracker = new ChangeTracker();
      tracker.track({
        type: 'arrayRemove',
        path: path('items'),
        index: 0,
      });

      expect(tracker.patches).toEqual([
        { op: 'remove', path: '/items/0' },
      ]);
    });

    it('generates move patch for arrayMove', () => {
      const tracker = new ChangeTracker();
      tracker.track({
        type: 'arrayMove',
        path: path('items'),
        fromIndex: 0,
        toIndex: 2,
      });

      expect(tracker.patches).toEqual([
        { op: 'move', from: '/items/0', path: '/items/2' },
      ]);
    });

    it('generates replace patch with index for arrayReplace', () => {
      const tracker = new ChangeTracker();
      tracker.track({
        type: 'arrayReplace',
        path: path('items'),
        index: 0,
        value: { name: 'Replaced', price: 999 },
      });

      expect(tracker.patches).toEqual([
        { op: 'replace', path: '/items/0', value: { name: 'Replaced', price: 999 } },
      ]);
    });

    it('generates replace with empty array for arrayClear', () => {
      const tracker = new ChangeTracker();
      tracker.track({
        type: 'arrayClear',
        path: path('items'),
      });

      expect(tracker.patches).toEqual([
        { op: 'replace', path: '/items', value: [] },
      ]);
    });

    it('generates multiple patches for multiple changes', () => {
      const tracker = new ChangeTracker();
      tracker.track({
        type: 'setValue',
        path: path('name'),
        value: 'Jane',
        oldValue: 'John',
      });
      tracker.track({
        type: 'arrayPush',
        path: path('items'),
        value: { name: 'New' },
      });
      tracker.track({
        type: 'removeProperty',
        path: path('obsolete'),
      });

      const patches = tracker.patches;

      expect(patches).toHaveLength(3);
      expect(patches[0]).toEqual({ op: 'replace', path: '/name', value: 'Jane' });
      expect(patches[1]).toEqual({ op: 'add', path: '/items/-', value: { name: 'New' } });
      expect(patches[2]).toEqual({ op: 'remove', path: '/obsolete' });
    });

    it('returns empty after clear', () => {
      const tracker = new ChangeTracker();
      tracker.track({
        type: 'setValue',
        path: path('name'),
        value: 'Jane',
        oldValue: 'John',
      });

      tracker.clear();

      expect(tracker.patches).toEqual([]);
    });
  });
});
