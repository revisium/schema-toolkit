import { AbstractBasePath } from '../base-path/AbstractBasePath.js';
import type { Path, PathSegment } from './types.js';
import { PropertySegment, ItemsSegment } from './PathSegment.js';

class PathImpl extends AbstractBasePath<PathSegment, Path> implements Path {
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
}

export const EMPTY_PATH: Path = new PathImpl([]);

export function createPath(segments: readonly PathSegment[]): Path {
  return segments.length === 0 ? EMPTY_PATH : new PathImpl(segments);
}
