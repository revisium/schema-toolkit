import { JsonArray, JsonObject, JsonValue } from '../types';

function parsePathSegments(path: string): (string | number)[] {
  const segments: (string | number)[] = [];
  const regex = /([^.[\]]+)|\[(\d+)]/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(path))) {
    if (match[1] !== undefined) {
      segments.push(match[1]);
    } else if (match[2] !== undefined) {
      segments.push(Number(match[2]));
    }
  }

  return segments;
}

/**
 * Parse path string into segments
 *
 * @param path - Path string (e.g., "title", "address.city", "tags[0]", "users[0].name")
 * @returns Array of segments (strings and numbers)
 *
 * @example
 * parsePath("title")           // ["title"]
 * parsePath("address.city")    // ["address", "city"]
 * parsePath("tags[0]")         // ["tags", 0]
 * parsePath("users[0].name")   // ["users", 0, "name"]
 * parsePath("matrix[0][1]")    // ["matrix", 0, 1]
 */
export function parsePath(path: string): (string | number)[] {
  if (!path) {
    return [];
  }

  return parsePathSegments(path);
}

/**
 * Get value by path from plain JavaScript object
 *
 * @param obj - Object to navigate
 * @param path - Path string (e.g., "address.city", "tags[0]")
 * @returns Value at path, or undefined if path doesn't exist
 *
 * @example
 * const obj = { address: { city: "Moscow" }, tags: ["a", "b"] };
 * getValueByPath(obj, "address.city")  // "Moscow"
 * getValueByPath(obj, "tags[1]")       // "b"
 * getValueByPath(obj, "nonexistent")   // undefined
 */
export function getValueByPath(
  obj: JsonValue | undefined,
  path: string,
): JsonValue | undefined {
  if (!path) {
    return obj;
  }

  const segments = parsePath(path);
  let current: JsonValue | undefined = obj;

  for (const segment of segments) {
    if (current == null) {
      return undefined;
    }

    if (typeof segment === 'number') {
      if (!Array.isArray(current)) {
        return undefined;
      }
      current = current[segment];
    } else {
      if (typeof current !== 'object') {
        return undefined;
      }
      current = (current as JsonObject)[segment];
    }
  }

  return current;
}

/**
 * Set value by path in plain JavaScript object
 * Creates intermediate objects/arrays as needed
 *
 * @param obj - Object to modify
 * @param path - Path string (e.g., "address.city", "tags[0]")
 * @param value - Value to set
 *
 * @example
 * const obj = {};
 * setValueByPath(obj, "address.city", "London");
 * // obj is now { address: { city: "London" } }
 *
 * setValueByPath(obj, "tags[0]", "first");
 * // obj is now { address: { city: "London" }, tags: ["first"] }
 */
export function setValueByPath(
  obj: JsonValue,
  path: string,
  value: JsonValue,
): void {
  if (!path) {
    throw new Error('Cannot set root value');
  }

  const segments = parsePath(path);
  let current: JsonValue | undefined = obj;

  for (let i = 0; i < segments.length - 1; i++) {
    const segment = segments[i] as string | number;
    const nextSegment = segments[i + 1];

    if (typeof segment === 'number') {
      if (!Array.isArray(current)) {
        throw new TypeError(
          `Cannot set array index on non-array at segment ${i}`,
        );
      }

      const arr: JsonArray = current;

      if (segment > arr.length) {
        throw new Error(
          `Cannot create sparse array: index ${segment} is out of bounds (array length: ${arr.length}) at segment ${i}`,
        );
      }

      if (arr[segment] == null) {
        arr[segment] = typeof nextSegment === 'number' ? [] : {};
      }

      current = arr[segment];
    } else if (typeof segment === 'string') {
      if (
        current == null ||
        typeof current !== 'object' ||
        Array.isArray(current)
      ) {
        throw new Error(`Cannot set property on non-object at segment ${i}`);
      }

      const obj: JsonObject = current;
      if (obj[segment] == null) {
        obj[segment] = typeof nextSegment === 'number' ? [] : {};
      }

      current = obj[segment];
    }
  }

  const lastSegment = segments[segments.length - 1] as string | number;

  if (typeof lastSegment === 'number') {
    if (!Array.isArray(current)) {
      throw new TypeError(
        `Cannot set array index on non-array at segment ${segments.length - 1}`,
      );
    }

    const arr: JsonArray = current;

    if (lastSegment > arr.length) {
      throw new Error(
        `Cannot create sparse array: index ${lastSegment} is out of bounds (array length: ${arr.length})`,
      );
    }

    arr[lastSegment] = value;
  } else if (typeof lastSegment === 'string') {
    if (
      current == null ||
      typeof current !== 'object' ||
      Array.isArray(current)
    ) {
      throw new Error(
        `Cannot set property on non-object at segment ${segments.length - 1}`,
      );
    }
    (current as JsonObject)[lastSegment] = value;
  }
}

/**
 * Check if path exists in object
 *
 * @param obj - Object to check
 * @param path - Path string (e.g., "address.city", "tags[0]")
 * @returns true if path exists and value is not undefined
 *
 * @example
 * const obj = { address: { city: "Moscow" } };
 * hasPath(obj, "address.city") // true
 * hasPath(obj, "address.country") // false
 */
export function hasPath(obj: JsonValue, path: string): boolean {
  const value = getValueByPath(obj, path);
  return value !== undefined;
}

/**
 * Deep equality comparison for plain JavaScript values
 * Handles objects, arrays, primitives, null, undefined
 *
 * @param a - First value
 * @param b - Second value
 * @returns true if values are deeply equal
 *
 * @example
 * deepEqual({ a: 1, b: 2 }, { a: 1, b: 2 })  // true
 * deepEqual([1, 2, 3], [1, 2, 3])            // true
 * deepEqual({ a: 1 }, { a: 2 })              // false
 * deepEqual(null, null)                      // true
 * deepEqual(undefined, undefined)            // true
 */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) {
    return true;
  }

  if (a === null && b === null) {
    return true;
  }

  if (a === undefined && b === undefined) {
    return true;
  }

  if (a == null || b == null) {
    return false;
  }

  if (typeof a !== typeof b) {
    return false;
  }

  if (typeof a !== 'object') {
    return false;
  }

  if (Array.isArray(a) && Array.isArray(b)) {
    const arrA = a as JsonArray;
    const arrB = b as JsonArray;
    if (arrA.length !== arrB.length) {
      return false;
    }
    for (let i = 0; i < arrA.length; i++) {
      const itemA = arrA[i];
      const itemB = arrB[i];

      if (itemA !== undefined && itemB !== undefined) {
        if (itemA === null && itemB === null) {
          continue;
        }
        if (!deepEqual(itemA, itemB)) {
          return false;
        }
      } else if (itemA !== itemB) {
        return false;
      }
    }
    return true;
  }

  if (Array.isArray(a) || Array.isArray(b)) {
    return false;
  }

  const objA = a as JsonObject;
  const objB = b as JsonObject;
  const keysA = Object.keys(objA);
  const keysB = Object.keys(objB);

  if (keysA.length !== keysB.length) {
    return false;
  }

  for (const key of keysA) {
    if (!keysB.includes(key)) {
      return false;
    }
    const valA = objA[key];
    const valB = objB[key];

    if (valA !== undefined && valB !== undefined) {
      if (valA === null && valB === null) {
        continue;
      }
      if (!deepEqual(valA, valB)) {
        return false;
      }
    } else if (valA !== valB) {
      return false;
    }
  }

  return true;
}

/**
 * Convert simplified JSON path to JSON Schema path
 *
 * @param jsonPath - JSON path string (e.g., "title", "address.city", "tags[0]", "users[0].name")
 * @returns JSON Schema path string
 *
 * @example
 * convertJsonPathToSchemaPath("title") // "/properties/title"
 * convertJsonPathToSchemaPath("address.city") // "/properties/address/properties/city"
 * convertJsonPathToSchemaPath("tags[0]") // "/properties/tags/items"
 * convertJsonPathToSchemaPath("users[0].name") // "/properties/users/items/properties/name"
 * convertJsonPathToSchemaPath("") // ""
 */
export function convertJsonPathToSchemaPath(jsonPath: string): string {
  if (jsonPath === '') {
    return '';
  }

  const segments = parsePathSegments(jsonPath);

  let schemaPath = '';
  for (const segment of segments) {
    if (typeof segment === 'number') {
      schemaPath += '/items';
    } else {
      schemaPath += `/properties/${segment}`;
    }
  }

  return schemaPath;
}

export function convertSchemaPathToJsonPath(schemaPath: string): string {
  if (schemaPath === '') {
    return '';
  }

  const cleanPath = schemaPath.startsWith('/') ? schemaPath.slice(1) : schemaPath;

  if (cleanPath === '') {
    return '';
  }

  const segments = cleanPath.split('/');
  let result = '';

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];

    if (segment === 'properties') {
      i++;
      if (i < segments.length) {
        const propertyName = segments[i];
        if (propertyName) {
          if (result) {
            result += '.';
          }
          result += propertyName;
        }
      }
    } else if (segment === 'items') {
      result += '[*]';
    }
  }

  return result;
}
