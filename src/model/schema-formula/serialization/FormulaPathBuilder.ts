import type { Path, PathSegment } from '../../../core/path/index.js';

export class FormulaPathBuilder {
  buildWithArrayNotation(fromPath: Path, toPath: Path): string {
    const fromSegments = fromPath.parent().segments();
    const toSegments = toPath.segments();

    const commonLength = this.findCommonPrefixLength(fromSegments, toSegments);
    const upCount = fromSegments.length - commonLength;

    const parts = this.buildPartsWithArrayNotation(
      upCount,
      toSegments,
      commonLength,
    );

    return this.formatPartsWithArrayNotation(parts, toSegments);
  }

  private findCommonPrefixLength(
    fromSegments: readonly PathSegment[],
    toSegments: readonly PathSegment[],
  ): number {
    const minLen = Math.min(fromSegments.length, toSegments.length);
    let commonPrefixLen = 0;

    for (let i = 0; i < minLen; i++) {
      const fromSeg = fromSegments[i];
      const toSeg = toSegments[i];

      if (!fromSeg || !toSeg) {
        break;
      }

      if (fromSeg.isItems() && toSeg.isItems()) {
        commonPrefixLen++;
      } else if (
        fromSeg.isProperty() &&
        toSeg.isProperty() &&
        fromSeg.propertyName() === toSeg.propertyName()
      ) {
        commonPrefixLen++;
      } else {
        break;
      }
    }

    return commonPrefixLen;
  }

  private buildPartsWithArrayNotation(
    upCount: number,
    toSegments: readonly PathSegment[],
    startIndex: number,
  ): string[] {
    const parts: string[] = [];

    for (let i = 0; i < upCount; i++) {
      parts.push('..');
    }

    for (let i = startIndex; i < toSegments.length; i++) {
      const seg = toSegments[i];
      if (seg) {
        if (seg.isProperty()) {
          parts.push(seg.propertyName());
        } else if (seg.isItems() && parts.length > 0) {
          const lastPart = parts.at(-1);
          if (lastPart && lastPart !== '..') {
            parts[parts.length - 1] = lastPart + '[*]';
          }
        }
      }
    }

    return parts;
  }

  private formatPartsWithArrayNotation(
    parts: string[],
    toSegments: readonly PathSegment[],
  ): string {
    if (parts.length === 0) {
      const lastSeg = toSegments.at(-1);
      if (lastSeg?.isProperty()) {
        return lastSeg.propertyName();
      }
      return '';
    }

    if (parts[0] === '..') {
      return parts.join('/');
    }

    return parts.join('.');
  }
}
