import type { ValuePath, ValuePathSegment } from './types.js';
import { createValuePath } from './ValuePath.js';
import { PropertySegment, IndexSegment } from './ValuePathSegment.js';

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
      if (current) {
        segments.push(new PropertySegment(current));
        current = '';
      }
      i++;
    } else if (char === '[') {
      if (current) {
        segments.push(new PropertySegment(current));
        current = '';
      }
      i++;
      let indexStr = '';
      while (i < path.length && path[i] !== ']') {
        indexStr += path[i];
        i++;
      }
      if (path[i] === ']') {
        i++;
      }
      segments.push(new IndexSegment(parseInt(indexStr, 10)));
    } else {
      current += char;
      i++;
    }
  }

  if (current) {
    segments.push(new PropertySegment(current));
  }

  return segments;
}

export function stringToValuePath(path: string): ValuePath {
  return createValuePath(parseValuePath(path));
}
