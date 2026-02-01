import type { FieldChange } from './types.js';
import { FieldChangeType } from './types.js';

export function computeValueDiff(
  fromValue: unknown,
  toValue: unknown,
): FieldChange[] {
  if (fromValue === null && toValue === null) {
    return [];
  }

  if (fromValue === null && toValue !== null) {
    return [createChange('', null, toValue, FieldChangeType.Added)];
  }

  if (fromValue !== null && toValue === null) {
    return [createChange('', fromValue, null, FieldChangeType.Removed)];
  }

  return computeDiff(fromValue, toValue, '');
}

function computeDiff(
  fromValue: unknown,
  toValue: unknown,
  path: string,
): FieldChange[] {
  if (deepEqual(fromValue, toValue)) {
    return [];
  }

  if (isPrimitive(fromValue) || isPrimitive(toValue)) {
    return [createChange(path, fromValue, toValue, FieldChangeType.Modified)];
  }

  if (hasTypeChanged(fromValue, toValue)) {
    return [createChange(path, fromValue, toValue, FieldChangeType.Modified)];
  }

  if (Array.isArray(fromValue) && Array.isArray(toValue)) {
    return computeArrayDiff(fromValue, toValue, path);
  }

  return computeObjectDiff(
    fromValue as Record<string, unknown>,
    toValue as Record<string, unknown>,
    path,
  );
}

function computeObjectDiff(
  fromObj: Record<string, unknown>,
  toObj: Record<string, unknown>,
  basePath: string,
): FieldChange[] {
  const changes: FieldChange[] = [];
  const fromKeys = Object.keys(fromObj);
  const toKeys = new Set(Object.keys(toObj));

  for (const key of fromKeys) {
    const fieldPath = joinPath(basePath, key);

    if (!toKeys.has(key)) {
      changes.push(
        createChange(fieldPath, fromObj[key], null, FieldChangeType.Removed),
      );
    } else {
      changes.push(...computeDiff(fromObj[key], toObj[key], fieldPath));
    }
  }

  for (const key of toKeys) {
    if (!fromKeys.includes(key)) {
      const fieldPath = joinPath(basePath, key);
      changes.push(
        createChange(fieldPath, null, toObj[key], FieldChangeType.Added),
      );
    }
  }

  return changes;
}

function computeArrayDiff(
  fromArr: unknown[],
  toArr: unknown[],
  basePath: string,
): FieldChange[] {
  const changes: FieldChange[] = [];
  const maxLen = Math.max(fromArr.length, toArr.length);

  for (let i = 0; i < maxLen; i++) {
    const fieldPath = joinPath(basePath, String(i));
    const hasFrom = i < fromArr.length;
    const hasTo = i < toArr.length;

    if (hasFrom && hasTo) {
      changes.push(...computeDiff(fromArr[i], toArr[i], fieldPath));
    } else if (hasFrom) {
      changes.push(
        createChange(fieldPath, fromArr[i], null, FieldChangeType.Removed),
      );
    } else {
      changes.push(
        createChange(fieldPath, null, toArr[i], FieldChangeType.Added),
      );
    }
  }

  return changes;
}

function isPrimitive(value: unknown): boolean {
  return (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  );
}

function hasTypeChanged(fromValue: unknown, toValue: unknown): boolean {
  const fromIsArray = Array.isArray(fromValue);
  const toIsArray = Array.isArray(toValue);
  return fromIsArray !== toIsArray;
}

function joinPath(base: string, segment: string): string {
  return base ? `${base}.${segment}` : segment;
}

function createChange(
  path: string,
  oldValue: unknown,
  newValue: unknown,
  changeType: FieldChangeType,
): FieldChange {
  return { path, oldValue, newValue, changeType };
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) {
    return true;
  }

  if (typeof a !== typeof b) {
    return false;
  }

  if (typeof a !== 'object' || a === null || b === null) {
    return false;
  }

  if (Array.isArray(a) !== Array.isArray(b)) {
    return false;
  }

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) {
      return false;
    }
    return a.every((item, index) => deepEqual(item, b[index]));
  }

  const aObj = a as Record<string, unknown>;
  const bObj = b as Record<string, unknown>;
  const aKeys = Object.keys(aObj);
  const bKeys = Object.keys(bObj);

  if (aKeys.length !== bKeys.length) {
    return false;
  }

  return aKeys.every((key) => deepEqual(aObj[key], bObj[key]));
}
