import type { NodeMetadata } from './types.js';

export interface NodeOptionsWithMetadata {
  metadata?: NodeMetadata;
  ref?: string;
}

export function isNodeMetadata(
  value: NodeOptionsWithMetadata | NodeMetadata,
): value is NodeMetadata {
  return 'title' in value || 'description' in value || 'deprecated' in value;
}

export function normalizeNodeOptions<T extends NodeOptionsWithMetadata>(
  options: T | NodeMetadata,
): T {
  if (isNodeMetadata(options)) {
    return { metadata: options } as T;
  }
  return options;
}
