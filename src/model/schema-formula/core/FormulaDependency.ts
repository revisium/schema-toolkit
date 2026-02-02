export interface FormulaDependency {
  targetNodeId(): string;
}

export class ResolvedDependency implements FormulaDependency {
  constructor(private readonly nodeId: string) {
    if (!nodeId) {
      throw new Error('ResolvedDependency requires a non-empty nodeId');
    }
  }

  targetNodeId(): string {
    return this.nodeId;
  }
}
