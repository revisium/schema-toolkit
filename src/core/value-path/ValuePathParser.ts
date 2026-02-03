import type { ValuePath, ValuePathSegment } from './types.js';
import { createValuePath } from './ValuePath.js';
import { PropertySegment, IndexSegment } from './ValuePathSegment.js';

function parseIndexSegment(
  path: string,
  startIndex: number,
): { segment: IndexSegment; nextIndex: number } {
  let i = startIndex;
  let indexStr = '';

  while (i < path.length && path[i] !== ']') {
    indexStr += path[i];
    i++;
  }

  if (path[i] !== ']') {
    throw new Error(`Invalid path: missing closing bracket in "${path}"`);
  }

  if (indexStr === '' || !/^\d+$/.test(indexStr)) {
    throw new Error(
      `Invalid path: index must be a non-negative integer, got "${indexStr}" in "${path}"`,
    );
  }

  return {
    segment: new IndexSegment(Number.parseInt(indexStr, 10)),
    nextIndex: i + 1,
  };
}

function pushPropertyIfNotEmpty(segments: ValuePathSegment[], current: string): void {
  if (current) {
    segments.push(new PropertySegment(current));
  }
}

export function parseValuePath(path: string): ValuePathSegment[] {
  if (!path) {
    return [];
  }

  const segments: ValuePathSegment[] = [];
  let current = '';
  let i = 0;

  while (i < path.length) {
    const char = path[i];

    if (char === '.') {
      pushPropertyIfNotEmpty(segments, current);
      current = '';
      i++;
    } else if (char === '[') {
      pushPropertyIfNotEmpty(segments, current);
      current = '';
      const result = parseIndexSegment(path, i + 1);
      segments.push(result.segment);
      i = result.nextIndex;
    } else {
      current += char;
      i++;
    }
  }

  pushPropertyIfNotEmpty(segments, current);

  return segments;
}

export function stringToValuePath(path: string): ValuePath {
  return createValuePath(parseValuePath(path));
}
