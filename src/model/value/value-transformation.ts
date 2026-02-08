import type { JsonSchemaType } from '../../types/schema.types.js';
import { JsonArrayStore } from '../schema/json-array.store.js';
import { JsonSchemaStore } from '../schema/json-schema.store.js';
import { JsonObjectStore } from '../schema/json-object.store.js';

export const equal = (value: unknown): unknown => value;

export const fromNumberToString = (
  value: number,
  defaultValue: string = '',
): string => value.toString() || defaultValue;

export const fromBooleanToString = (
  value: boolean,
  defaultValue: string = '',
): string => value.toString() || defaultValue;

export const fromStringToBoolean = (
  value: string,
  defaultValue: boolean = false,
): boolean => {
  if (!value) {
    return defaultValue;
  }

  if (value.toLowerCase() === 'false') {
    return false;
  }

  return true;
};

export const fromStringToNumber = (
  value: string,
  defaultValue: number = 0,
): number => {
  const number = Number.parseFloat(value);

  if (Number.isNaN(number)) {
    return defaultValue;
  }

  return number;
};

export const fromBooleanToNumber = (value: boolean): number => {
  return Number(value);
};

export const fromNumberToBoolean = (value: number): boolean => {
  return Boolean(value);
};

export const toArrayTransformation =
  (transformation: Transformation) => (value: unknown) => {
    const result = transformation(value);
    return [result];
  };

export const fromArrayTransformation =
  (transformation: Transformation) => (value: unknown) => {
    if (Array.isArray(value) && value.length) {
      return transformation(value[0]);
    }
    return undefined;
  };

export const fromObjectToPrimitive = (
  _value: unknown,
  defaultValue: unknown,
): unknown => {
  return defaultValue;
};

export const fromPrimitiveToObject = (
  _value: unknown,
  defaultValue: unknown,
): unknown => {
  return defaultValue;
};

export const fromObjectToArray = (
  _value: unknown,
  defaultValue: unknown,
): unknown => {
  return defaultValue;
};

export const fromArrayToObject = (
  _value: unknown,
  defaultValue: unknown,
): unknown => {
  return defaultValue;
};

const replaceTransformationsMapper: ReplaceTransformationsMapper = [
  {
    fromType: 'number',
    toType: 'string',
    transformation: fromNumberToString as Transformation,
  },
  {
    fromType: 'string',
    toType: 'number',
    transformation: fromStringToNumber as Transformation,
  },
  {
    fromType: 'boolean',
    toType: 'string',
    transformation: fromBooleanToString as Transformation,
  },
  {
    fromType: 'string',
    toType: 'boolean',
    transformation: fromStringToBoolean as Transformation,
  },
  {
    fromType: 'boolean',
    toType: 'number',
    transformation: fromBooleanToNumber as Transformation,
  },
  {
    fromType: 'number',
    toType: 'boolean',
    transformation: fromNumberToBoolean as Transformation,
  },
];
export const getTransformation = (
  from: JsonSchemaStore,
  to: JsonSchemaStore,
): Transformation | undefined => {
  if (
    from instanceof JsonObjectStore &&
    !(to instanceof JsonObjectStore) &&
    !(to instanceof JsonArrayStore)
  ) {
    return fromObjectToPrimitive;
  }

  if (
    !(from instanceof JsonObjectStore) &&
    !(from instanceof JsonArrayStore) &&
    to instanceof JsonObjectStore
  ) {
    return fromPrimitiveToObject;
  }

  if (from instanceof JsonObjectStore && to instanceof JsonArrayStore) {
    return fromObjectToArray;
  }

  if (from instanceof JsonArrayStore && to instanceof JsonObjectStore) {
    return fromArrayToObject;
  }

  if (from instanceof JsonArrayStore && to instanceof JsonArrayStore) {
    const itemTransformation = findTransformation(
      from.items.type,
      to.items.type,
    );

    if (itemTransformation && itemTransformation !== equal) {
      return (value: unknown, defaultValue?: unknown) => {
        if (!Array.isArray(value)) {
          return defaultValue;
        }

        return value.map((item) => {
          const result = itemTransformation(item, to.items.default);
          return result !== undefined ? result : to.items.default;
        });
      };
    }

    if (from.items.type !== to.items.type) {
      return (_value: unknown, defaultValue?: unknown) => defaultValue;
    }

    return equal;
  }

  if (to instanceof JsonArrayStore) {
    const transformation = findTransformation(from.type, to.items.type);

    if (!transformation) {
      return;
    }

    return toArrayTransformation(transformation);
  }

  if (from instanceof JsonArrayStore) {
    const transformation = findTransformation(from.items.type, to.type);

    if (!transformation) {
      return;
    }

    return fromArrayTransformation(transformation);
  }

  return findTransformation(from.type, to.type);
};

const findTransformation = (
  from: JsonSchemaType,
  to: JsonSchemaType,
): Transformation | undefined => {
  if (from === to) {
    return equal;
  }

  for (const item of replaceTransformationsMapper) {
    if (item.fromType === from && item.toType === to) {
      return item.transformation;
    }
  }

  return undefined;
};

type Transformation = (value: unknown, defaultValue?: unknown) => unknown;
type ReplaceTransformationsMapper = {
  fromType: JsonSchemaType;
  toType: JsonSchemaType;
  transformation: Transformation;
}[];
