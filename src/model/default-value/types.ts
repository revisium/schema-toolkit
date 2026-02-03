import type { JsonSchema } from '../../types/schema.types.js';

export interface GenerateDefaultValueOptions {
  arrayItemCount?: number;
  refSchemas?: Record<string, JsonSchema>;
}
