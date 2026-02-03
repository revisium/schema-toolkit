import { AbstractBasePath } from '../base-path/AbstractBasePath.js';
import type { ValuePath, ValuePathSegment } from './types.js';
import { PropertySegment, IndexSegment } from './ValuePathSegment.js';

class ValuePathImpl
  extends AbstractBasePath<ValuePathSegment, ValuePath>
  implements ValuePath
{
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
}

export const EMPTY_VALUE_PATH: ValuePath = new ValuePathImpl([]);

export function createValuePath(segments: readonly ValuePathSegment[]): ValuePath {
  return segments.length === 0 ? EMPTY_VALUE_PATH : new ValuePathImpl(segments);
}
