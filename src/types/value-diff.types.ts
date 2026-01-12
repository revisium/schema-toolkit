export enum FieldChangeType {
  Added = 'ADDED',
  Removed = 'REMOVED',
  Modified = 'MODIFIED',
}

export interface FieldChange {
  path: string;
  oldValue: unknown;
  newValue: unknown;
  changeType: FieldChangeType;
}
