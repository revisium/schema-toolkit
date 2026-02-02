import type { ValuePath, ValuePathSegment } from './types.js';
import { PropertySegment, IndexSegment } from './ValuePathSegment.js';

class ValuePathImpl implements ValuePath {
  constructor(private readonly segs: readonly ValuePathSegment[]) {}

  segments(): readonly ValuePathSegment[] {
    return this.segs;
  }

  asString(): string {
    const parts: string[] = [];

    for (const seg of this.segs) {
      if (seg.isProperty()) {
        if (parts.length > 0) {
          parts.push('.');
        }
        parts.push(seg.propertyName());
      } else if (seg.isIndex()) {
        parts.push(`[${seg.indexValue()}]`);
      }
    }

    return parts.join('');
  }

  parent(): ValuePath {
    if (this.segs.length <= 1) {
      return EMPTY_VALUE_PATH;
    }
    return new ValuePathImpl(this.segs.slice(0, -1));
  }

  child(name: string): ValuePath {
    return new ValuePathImpl([...this.segs, new PropertySegment(name)]);
  }

  childIndex(index: number): ValuePath {
    return new ValuePathImpl([...this.segs, new IndexSegment(index)]);
  }

  equals(other: ValuePath): boolean {
    const otherSegs = other.segments();
    if (this.segs.length !== otherSegs.length) {
      return false;
    }
    for (let i = 0; i < this.segs.length; i++) {
      const a = this.segs[i];
      const b = otherSegs[i];
      if (!a || !b || !a.equals(b)) {
        return false;
      }
    }
    return true;
  }

  isEmpty(): boolean {
    return this.segs.length === 0;
  }

  length(): number {
    return this.segs.length;
  }

  isChildOf(parent: ValuePath): boolean {
    const parentSegs = parent.segments();
    if (this.segs.length <= parentSegs.length) {
      return false;
    }
    for (let i = 0; i < parentSegs.length; i++) {
      const a = this.segs[i];
      const b = parentSegs[i];
      if (!a || !b || !a.equals(b)) {
        return false;
      }
    }
    return true;
  }
}

export const EMPTY_VALUE_PATH: ValuePath = new ValuePathImpl([]);

export function createValuePath(segments: readonly ValuePathSegment[]): ValuePath {
  return segments.length === 0 ? EMPTY_VALUE_PATH : new ValuePathImpl(segments);
}
