export class FormulaError extends Error {
  constructor(
    message: string,
    public readonly nodeId: string,
    public readonly details?: string,
  ) {
    super(message);
    this.name = 'FormulaError';
  }
}
