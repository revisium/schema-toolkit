import type { ReactivityAdapter } from '../../core/reactivity/types.js';
import type { ForeignKeyResolver } from '../foreign-key-resolver/ForeignKeyResolver.js';

export interface DataModelOptions {
  reactivity?: ReactivityAdapter;
  fkResolver?: ForeignKeyResolver;
}
