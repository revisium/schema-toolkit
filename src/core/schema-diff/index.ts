export type {
  RawChange,
  AddedChange,
  RemovedChange,
  MovedChange,
  ModifiedChange,
  CoalescedChanges,
  ChangeType,
} from './types.js';
export { SchemaDiff } from './SchemaDiff.js';
export { NodePathIndex } from './NodePathIndex.js';
export { ChangeCollector, collectChanges } from './ChangeCollector.js';
export { ChangeCoalescer, coalesceChanges } from './ChangeCoalescer.js';
export {
  areNodesEqual,
  areNodesContentEqual,
  type ComparatorContext,
} from './SchemaComparator.js';
