export type SchemaValidationErrorType =
  | 'empty-name'
  | 'duplicate-name'
  | 'invalid-name';

export interface SchemaValidationError {
  nodeId: string;
  type: SchemaValidationErrorType;
  message: string;
}
