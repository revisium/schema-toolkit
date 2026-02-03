export type SchemaValidationErrorType =
  | 'empty-name'
  | 'duplicate-name'
  | 'invalid-name'
  | 'empty-foreign-key';

export interface SchemaValidationError {
  nodeId: string;
  type: SchemaValidationErrorType;
  message: string;
}
