import type { SchemaTree } from '../schema-tree/index.js';
import {
  NodePathIndex,
  collectChanges,
  coalesceChanges,
} from '../schema-diff/index.js';
import { PatchGenerator } from './PatchGenerator.js';
import { PatchEnricher } from './PatchEnricher.js';
import type { SchemaPatch } from './types.js';

export class PatchBuilder {
  build(currentTree: SchemaTree, baseTree: SchemaTree): SchemaPatch[] {
    const index = new NodePathIndex(baseTree);
    this.syncReplacements(currentTree, index);

    const rawChanges = collectChanges(baseTree, currentTree, index);
    const coalesced = coalesceChanges(rawChanges, currentTree, index);

    const generator = new PatchGenerator(currentTree, baseTree);
    const patches = generator.generate(coalesced);

    const enricher = new PatchEnricher(currentTree, baseTree);
    return patches.map((patch) => enricher.enrich(patch));
  }

  private syncReplacements(tree: SchemaTree, index: NodePathIndex): void {
    for (const [oldId, newId] of tree.replacements()) {
      index.trackReplacement(oldId, newId);
    }
  }
}
