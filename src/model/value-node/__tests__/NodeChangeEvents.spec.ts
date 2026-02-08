import type { JsonArraySchema } from '../../../types/schema.types.js';
import { str, arr, obj } from '../../../mocks/schema.mocks.js';
import {
  StringValueNode,
  ObjectValueNode,
  ArrayValueNode,
  resetNodeIdCounter,
  createNodeFactory,
} from '../index.js';
import type { NodeChangeEvent } from '../types.js';

beforeEach(() => {
  resetNodeIdCounter();
});

describe('NodeChangeEvents', () => {
  describe('PrimitiveValueNode', () => {
    it('emits setValue event on setValue()', () => {
      const node = new StringValueNode(undefined, 'name', str(), 'John');
      const events: NodeChangeEvent[] = [];
      node.on('change', (e) => events.push(e));

      node.setValue('Jane');

      expect(events).toHaveLength(1);
      expect(events[0]).toEqual({
        type: 'setValue',
        node,
        value: 'Jane',
        oldValue: 'John',
      });
    });

    it('does not emit when options.internal is true', () => {
      const schema = str({ formula: 'x' });
      const node = new StringValueNode(undefined, 'name', schema, 'old');
      const events: NodeChangeEvent[] = [];
      node.on('change', (e) => events.push(e));

      node.setValue('computed', { internal: true });

      expect(events).toHaveLength(0);
    });

    it('supports off to unsubscribe', () => {
      const node = new StringValueNode(undefined, 'name', str(), 'John');
      const events: NodeChangeEvent[] = [];
      const listener = (e: NodeChangeEvent) => events.push(e);
      node.on('change', listener);

      node.setValue('Jane');
      node.off('change', listener);
      node.setValue('Bob');

      expect(events).toHaveLength(1);
    });
  });

  describe('ObjectValueNode', () => {
    it('emits addChild event on addChild()', () => {
      const parent = new ObjectValueNode(undefined, 'root', obj({}));
      const child = new StringValueNode(undefined, 'name', str(), 'John');
      const events: NodeChangeEvent[] = [];
      parent.on('change', (e) => events.push(e));

      parent.addChild(child);

      expect(events).toHaveLength(1);
      expect(events[0]).toEqual({
        type: 'addChild',
        parent,
        child,
      });
    });

    it('emits removeChild event on removeChild()', () => {
      const child = new StringValueNode(undefined, 'name', str(), 'John');
      const parent = new ObjectValueNode(undefined, 'root', obj({ name: str() }), [child]);
      const events: NodeChangeEvent[] = [];
      parent.on('change', (e) => events.push(e));

      parent.removeChild('name');

      expect(events).toHaveLength(1);
      expect(events[0]).toEqual({
        type: 'removeChild',
        parent,
        childName: 'name',
        child,
      });
    });

    it('does not emit removeChild for non-existent child', () => {
      const parent = new ObjectValueNode(undefined, 'root', obj({}));
      const events: NodeChangeEvent[] = [];
      parent.on('change', (e) => events.push(e));

      parent.removeChild('missing');

      expect(events).toHaveLength(0);
    });

    it('does not emit from setValue (delegates to children)', () => {
      const child = new StringValueNode(undefined, 'name', str(), 'John');
      const parent = new ObjectValueNode(undefined, 'root', obj({ name: str() }), [child]);
      const parentEvents: NodeChangeEvent[] = [];
      parent.on('change', (e) => parentEvents.push(e));

      parent.setValue({ name: 'Jane' });

      expect(parentEvents).toHaveLength(0);
    });
  });

  describe('ArrayValueNode', () => {
    const createItem = (value: string) =>
      new StringValueNode(undefined, '0', str(), value);

    it('emits arrayPush on push()', () => {
      const node = new ArrayValueNode(undefined, 'items', arr(str()));
      const item = createItem('a');
      const events: NodeChangeEvent[] = [];
      node.on('change', (e) => events.push(e));

      node.push(item);

      expect(events).toHaveLength(1);
      expect(events[0]).toEqual({
        type: 'arrayPush',
        array: node,
        item,
      });
    });

    it('emits arrayInsert on insertAt()', () => {
      const existing = createItem('a');
      const node = new ArrayValueNode(undefined, 'items', arr(str()), [existing]);
      const item = createItem('b');
      const events: NodeChangeEvent[] = [];
      node.on('change', (e) => events.push(e));

      node.insertAt(0, item);

      expect(events).toHaveLength(1);
      expect(events[0]).toEqual({
        type: 'arrayInsert',
        array: node,
        index: 0,
        item,
      });
    });

    it('emits arrayRemove on removeAt() with removed item', () => {
      const item = createItem('a');
      const node = new ArrayValueNode(undefined, 'items', arr(str()), [item]);
      const events: NodeChangeEvent[] = [];
      node.on('change', (e) => events.push(e));

      node.removeAt(0);

      expect(events).toHaveLength(1);
      expect(events[0]).toEqual({
        type: 'arrayRemove',
        array: node,
        index: 0,
        item,
      });
    });

    it('emits arrayMove on move()', () => {
      const item1 = createItem('a');
      const item2 = createItem('b');
      const node = new ArrayValueNode(undefined, 'items', arr(str()), [item1, item2]);
      const events: NodeChangeEvent[] = [];
      node.on('change', (e) => events.push(e));

      node.move(0, 1);

      expect(events).toHaveLength(1);
      expect(events[0]).toEqual({
        type: 'arrayMove',
        array: node,
        fromIndex: 0,
        toIndex: 1,
      });
    });

    it('does not emit arrayMove when fromIndex equals toIndex', () => {
      const item = createItem('a');
      const node = new ArrayValueNode(undefined, 'items', arr(str()), [item]);
      const events: NodeChangeEvent[] = [];
      node.on('change', (e) => events.push(e));

      node.move(0, 0);

      expect(events).toHaveLength(0);
    });

    it('emits arrayReplace on replaceAt() with old and new items', () => {
      const oldItem = createItem('a');
      const node = new ArrayValueNode(undefined, 'items', arr(str()), [oldItem]);
      const newItem = createItem('b');
      const events: NodeChangeEvent[] = [];
      node.on('change', (e) => events.push(e));

      node.replaceAt(0, newItem);

      expect(events).toHaveLength(1);
      expect(events[0]).toEqual({
        type: 'arrayReplace',
        array: node,
        index: 0,
        item: newItem,
        oldItem,
      });
    });

    it('emits arrayClear on clear() with removed items', () => {
      const item1 = createItem('a');
      const item2 = createItem('b');
      const node = new ArrayValueNode(undefined, 'items', arr(str()), [item1, item2]);
      const events: NodeChangeEvent[] = [];
      node.on('change', (e) => events.push(e));

      node.clear();

      expect(events).toHaveLength(1);
      expect(events[0]).toEqual({
        type: 'arrayClear',
        array: node,
        items: [item1, item2],
      });
    });

    it('emits multiple events from pushValue (push is the leaf)', () => {
      const factory = createNodeFactory();
      const schema = arr(str()) as JsonArraySchema;
      const node = new ArrayValueNode(undefined, 'items', schema);
      node.setNodeFactory(factory);
      const events: NodeChangeEvent[] = [];
      node.on('change', (e) => events.push(e));

      node.pushValue('hello');

      expect(events).toHaveLength(1);
      expect(events[0]?.type).toBe('arrayPush');
    });

    it('emits events from setValue that grows array', () => {
      const factory = createNodeFactory();
      const schema = arr(str()) as JsonArraySchema;
      const existing = new StringValueNode(undefined, '0', str(), 'a');
      const node = new ArrayValueNode(undefined, 'items', schema, [existing]);
      node.setNodeFactory(factory);
      const arrayEvents: NodeChangeEvent[] = [];
      const childEvents: NodeChangeEvent[] = [];
      node.on('change', (e) => arrayEvents.push(e));
      existing.on('change', (e) => childEvents.push(e));

      node.setValue(['x', 'y']);

      expect(childEvents).toHaveLength(1);
      expect(childEvents[0]?.type).toBe('setValue');
      const pushEvents = arrayEvents.filter((e) => e.type === 'arrayPush');
      expect(pushEvents).toHaveLength(1);
    });

    it('emits events from setValue that shrinks array', () => {
      const item1 = createItem('a');
      const item2 = createItem('b');
      const schema = arr(str()) as JsonArraySchema;
      const node = new ArrayValueNode(undefined, 'items', schema, [item1, item2]);
      const events: NodeChangeEvent[] = [];
      node.on('change', (e) => events.push(e));

      node.setValue(['x']);

      const removeEvents = events.filter((e) => e.type === 'arrayRemove');
      expect(removeEvents).toHaveLength(1);
    });
  });
});
