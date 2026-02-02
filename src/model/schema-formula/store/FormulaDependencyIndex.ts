import type { Formula } from '../core/Formula.js';

export class FormulaDependencyIndex {
  private readonly dependentsMap = new Map<string, Set<string>>();
  private readonly formulasByNodeId = new Map<string, Formula>();

  registerFormula(formulaNodeId: string, formula: Formula): void {
    this.unregisterFormula(formulaNodeId);

    this.formulasByNodeId.set(formulaNodeId, formula);

    for (const dep of formula.dependencies()) {
      const targetId = dep.targetNodeId();
      let dependents = this.dependentsMap.get(targetId);
      if (!dependents) {
        dependents = new Set<string>();
        this.dependentsMap.set(targetId, dependents);
      }
      dependents.add(formulaNodeId);
    }
  }

  unregisterFormula(formulaNodeId: string): void {
    this.formulasByNodeId.delete(formulaNodeId);

    for (const [targetId, dependents] of this.dependentsMap) {
      dependents.delete(formulaNodeId);
      if (dependents.size === 0) {
        this.dependentsMap.delete(targetId);
      }
    }
  }

  getDependents(nodeId: string): readonly string[] {
    const dependents = this.dependentsMap.get(nodeId);
    return dependents ? Array.from(dependents) : [];
  }

  hasDependents(nodeId: string): boolean {
    const dependents = this.dependentsMap.get(nodeId);
    return dependents !== undefined && dependents.size > 0;
  }

  getFormula(nodeId: string): Formula | null {
    return this.formulasByNodeId.get(nodeId) ?? null;
  }

  hasFormula(nodeId: string): boolean {
    return this.formulasByNodeId.has(nodeId);
  }

  clear(): void {
    this.dependentsMap.clear();
    this.formulasByNodeId.clear();
  }

  forEachFormula(callback: (nodeId: string, formula: Formula) => void): void {
    for (const [nodeId, formula] of this.formulasByNodeId) {
      callback(nodeId, formula);
    }
  }

  size(): number {
    return this.formulasByNodeId.size;
  }
}
