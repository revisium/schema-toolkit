import { makeAutoObservable } from '../../core/reactivity/index.js';
import type { JsonValuePatch } from '../../types/json-value-patch.types.js';
import type { Change } from './types.js';

export class ChangeTracker {
  private _changes: Change[] = [];

  constructor() {
    makeAutoObservable(this);
  }

  get changes(): readonly Change[] {
    return this._changes;
  }

  get hasChanges(): boolean {
    return this._changes.length > 0;
  }

  track(change: Change): void {
    this._changes.push(change);
  }

  clear(): void {
    this._changes = [];
  }

  get patches(): readonly JsonValuePatch[] {
    const patches: JsonValuePatch[] = [];

    for (const change of this._changes) {
      const converted = this.changeToPatch(change);
      patches.push(...converted);
    }

    return patches;
  }

  private changeToPatch(change: Change): JsonValuePatch[] {
    const path = change.path.asJsonPointer();

    switch (change.type) {
      case 'setValue':
        return [{ op: 'replace', path, value: change.value }];

      case 'addProperty':
        return [{ op: 'add', path, value: change.value }];

      case 'removeProperty':
        return [{ op: 'remove', path }];

      case 'arrayPush':
        return [{ op: 'add', path: `${path}/-`, value: change.value }];

      case 'arrayInsert':
        return [
          { op: 'add', path: `${path}/${change.index}`, value: change.value },
        ];

      case 'arrayRemove':
        return [{ op: 'remove', path: `${path}/${change.index}` }];

      case 'arrayMove':
        return [
          {
            op: 'move',
            from: `${path}/${change.fromIndex}`,
            path: `${path}/${change.toIndex}`,
          },
        ];

      case 'arrayReplace':
        return [
          {
            op: 'replace',
            path: `${path}/${change.index}`,
            value: change.value,
          },
        ];

      case 'arrayClear':
        return [{ op: 'replace', path, value: [] }];
    }
  }
}
