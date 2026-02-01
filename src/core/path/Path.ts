import type { Path, PathSegment } from './types.js';
import { PropertySegment, ItemsSegment } from './PathSegment.js';

class PathImpl implements Path {
  constructor(private readonly segs: readonly PathSegment[]) {}

  segments(): readonly PathSegment[] {
    return this.segs;
  }

  asJsonPointer(): string {
    return this.segs
      .map((seg) =>
        seg.isProperty() ? `/properties/${seg.propertyName()}` : '/items',
      )
      .join('');
  }

  asSimple(): string {
    const parts: string[] = [];

    for (const seg of this.segs) {
      if (seg.isProperty()) {
        parts.push(seg.propertyName());
      } else if (seg.isItems()) {
        if (parts.length > 0) {
          const lastIndex = parts.length - 1;
          const lastPart = parts[lastIndex];
          if (lastPart !== undefined) {
            parts[lastIndex] = lastPart + '[*]';
          }
        } else {
          parts.push('[*]');
        }
      }
    }

    return parts.join('.');
  }

  parent(): Path {
    if (this.segs.length <= 1) {
      return EMPTY_PATH;
    }
    return new PathImpl(this.segs.slice(0, -1));
  }

  child(name: string): Path {
    return new PathImpl([...this.segs, new PropertySegment(name)]);
  }

  childItems(): Path {
    return new PathImpl([...this.segs, new ItemsSegment()]);
  }

  equals(other: Path): boolean {
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

  isChildOf(parent: Path): boolean {
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

export const EMPTY_PATH: Path = new PathImpl([]);

export function createPath(segments: readonly PathSegment[]): Path {
  return segments.length === 0 ? EMPTY_PATH : new PathImpl(segments);
}
