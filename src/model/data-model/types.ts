import type { ForeignKeyResolver } from '../foreign-key-resolver/ForeignKeyResolver.js';

export interface DataModelOptions {
  fkResolver?: ForeignKeyResolver;
}
