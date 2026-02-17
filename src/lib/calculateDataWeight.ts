import { JsonValueStore } from '../model/value/json-value.store.js';

export interface DataWeight {
  totalBytes: number;
  totalNodes: number;
  maxDepth: number;
  maxArrayLength: number;
  maxStringLength: number;
  totalStringsBytes: number;
}

export const calculateDataWeight = (data: unknown): DataWeight => {
  const result: DataWeight = {
    totalBytes: 0,
    totalNodes: 0,
    maxDepth: 0,
    maxArrayLength: 0,
    maxStringLength: 0,
    totalStringsBytes: 0,
  };

  result.totalBytes = JSON.stringify(data).length;
  walkValue(data, 0, result);
  return result;
};

const walkValue = (value: unknown, depth: number, result: DataWeight): void => {
  result.totalNodes++;

  if (result.maxDepth < depth) {
    result.maxDepth = depth;
  }

  if (value === null || value === undefined) {
    return;
  }

  if (typeof value === 'string') {
    if (value.length > result.maxStringLength) {
      result.maxStringLength = value.length;
    }
    result.totalStringsBytes += value.length;
    return;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return;
  }

  if (Array.isArray(value)) {
    if (value.length > result.maxArrayLength) {
      result.maxArrayLength = value.length;
    }
    for (const item of value) {
      walkValue(item, depth + 1, result);
    }
    return;
  }

  if (typeof value === 'object') {
    for (const val of Object.values(value)) {
      walkValue(val, depth + 1, result);
    }
  }
};

export const calculateDataWeightFromStore = (
  store: JsonValueStore,
): DataWeight => {
  const result: DataWeight = {
    totalBytes: 0,
    totalNodes: 0,
    maxDepth: 0,
    maxArrayLength: 0,
    maxStringLength: 0,
    totalStringsBytes: 0,
  };

  result.totalBytes = JSON.stringify(store.getPlainValue()).length;
  walkStore(store, 0, result);
  return result;
};

const walkStore = (
  store: JsonValueStore,
  depth: number,
  result: DataWeight,
): void => {
  result.totalNodes++;

  if (result.maxDepth < depth) {
    result.maxDepth = depth;
  }

  if (store.type === 'string') {
    const val = store.getPlainValue();
    if (val.length > result.maxStringLength) {
      result.maxStringLength = val.length;
    }
    result.totalStringsBytes += val.length;
  } else if (store.type === 'object') {
    for (const child of Object.values(store.value)) {
      walkStore(child, depth + 1, result);
    }
  } else if (store.type === 'array') {
    if (store.value.length > result.maxArrayLength) {
      result.maxArrayLength = store.value.length;
    }
    for (const child of store.value) {
      walkStore(child, depth + 1, result);
    }
  }
};
