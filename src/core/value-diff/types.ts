export enum FieldChangeType {
  Added = 'ADDED',
  Removed = 'REMOVED',
  Modified = 'MODIFIED',
}

export interface FieldChange {
  readonly path: string;
  readonly oldValue: unknown;
  readonly newValue: unknown;
  readonly changeType: FieldChangeType;
}
