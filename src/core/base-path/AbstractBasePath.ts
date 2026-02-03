import type { BasePath, BasePathSegment } from './types.js';

export abstract class AbstractBasePath<
  TSegment extends BasePathSegment,
  TSelf extends BasePath<TSegment, TSelf>,
> implements BasePath<TSegment, TSelf>
{
  constructor(protected readonly segs: readonly TSegment[]) {}

  segments(): readonly TSegment[] {
    return this.segs;
  }

  abstract parent(): TSelf;

  equals(other: TSelf): boolean {
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

  isChildOf(parent: TSelf): boolean {
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
