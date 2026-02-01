import type { Path, PathSegment } from './types.js';
import { createPath } from './Path.js';
import { PropertySegment, ItemsSegment } from './PathSegment.js';

export function jsonPointerToSegments(pointer: string): PathSegment[] {
  if (pointer === '' || pointer === '/') {
    return [];
  }

  const parts = pointer.split('/').filter(Boolean);
  const segments: PathSegment[] = [];

  let i = 0;
  while (i < parts.length) {
    const part = parts[i];
    if (part === 'properties') {
      const name = parts[i + 1];
      if (name === undefined || name === '') {
        throw new Error(
          `Invalid path: 'properties' segment requires a name in path ${pointer}`,
        );
      }
      segments.push(new PropertySegment(name));
      i += 2;
    } else if (part === 'items') {
      segments.push(new ItemsSegment());
      i += 1;
    } else {
      throw new Error(`Invalid path segment: ${part} in path ${pointer}`);
    }
  }

  return segments;
}

export function jsonPointerToPath(pointer: string): Path {
  return createPath(jsonPointerToSegments(pointer));
}

export function jsonPointerToSimplePath(pointer: string): string {
  return jsonPointerToPath(pointer).asSimple();
}
