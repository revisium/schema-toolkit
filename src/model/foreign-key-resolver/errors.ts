export class ForeignKeyNotFoundError extends Error {
  constructor(
    public readonly tableId: string,
    public readonly rowId?: string,
  ) {
    const message = rowId
      ? `Foreign key row not found: ${tableId}/${rowId}`
      : `Foreign key table not found: ${tableId}`;
    super(message);
    this.name = 'ForeignKeyNotFoundError';
  }
}

export class ForeignKeyResolverNotConfiguredError extends Error {
  constructor() {
    super('ForeignKeyResolver is not configured with a loader');
    this.name = 'ForeignKeyResolverNotConfiguredError';
  }
}
