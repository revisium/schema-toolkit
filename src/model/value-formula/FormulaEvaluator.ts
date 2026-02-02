import { evaluateWithContext } from '@revisium/formula';
import type {
  ValueNode,
  ObjectValueNodeInterface,
} from '../value-node/index.js';
import type { FormulaField, ValueTreeRoot, FormulaEngineOptions } from './types.js';

export class FormulaEvaluator {
  constructor(
    private readonly tree: ValueTreeRoot,
    private readonly options: FormulaEngineOptions = {},
  ) {}

  evaluate(field: FormulaField): void {
    try {
      const context = this.buildContext(field);
      const result = evaluateWithContext(field.expression, context);

      this.setNodeValue(field, result);
      this.checkForWarnings(field, result);
    } catch (error) {
      this.handleError(field, error as Error);
    }
  }

  evaluateAll(fields: Iterable<FormulaField>): void {
    for (const field of fields) {
      this.evaluate(field);
    }
  }

  private buildContext(field: FormulaField) {
    const rootData = this.tree.getPlainValue() as Record<string, unknown>;

    const context: {
      rootData: Record<string, unknown>;
      itemData?: Record<string, unknown>;
      currentPath?: string;
      arrayContext?: {
        levels: Array<{
          index: number;
          length: number;
          prev: unknown;
          next: unknown;
        }>;
      };
    } = { rootData };

    if (field.parent) {
      const itemData = this.getPlainObjectValue(field.parent);
      if (itemData) {
        context.itemData = itemData;
      }
    }

    if (field.arrayLevels.length > 0) {
      context.arrayContext = { levels: this.buildArrayLevels(field) };
    }

    return context;
  }

  private buildArrayLevels(field: FormulaField) {
    const levels: Array<{
      index: number;
      length: number;
      prev: unknown;
      next: unknown;
    }> = [];

    for (let i = field.arrayLevels.length - 1; i >= 0; i--) {
      const level = field.arrayLevels[i];
      if (!level) {
        continue;
      }
      const { array, index } = level;

      levels.push({
        index,
        length: array.length,
        prev: this.getPrevItemValue(array, index),
        next: this.getNextItemValue(array, index),
      });
    }

    return levels;
  }

  private getPrevItemValue(
    array: { at(i: number): ValueNode | undefined; length: number },
    index: number,
  ): unknown {
    if (index <= 0) {
      return null;
    }
    const prevItem = array.at(index - 1);
    return prevItem ? this.getPlainNodeValue(prevItem) : null;
  }

  private getNextItemValue(
    array: { at(i: number): ValueNode | undefined; length: number },
    index: number,
  ): unknown {
    if (index >= array.length - 1) {
      return null;
    }
    const nextItem = array.at(index + 1);
    return nextItem ? this.getPlainNodeValue(nextItem) : null;
  }

  private getPlainObjectValue(
    node: ObjectValueNodeInterface,
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const child of node.children) {
      result[child.name] = this.getPlainNodeValue(child);
    }
    return result;
  }

  private getPlainNodeValue(node: ValueNode): unknown {
    if (node.isPrimitive()) {
      return node.value;
    }
    if (node.isObject()) {
      return this.getPlainObjectValue(node);
    }
    if (node.isArray()) {
      const result: unknown[] = [];
      for (let i = 0; i < node.length; i++) {
        const item = node.at(i);
        if (item) {
          result.push(this.getPlainNodeValue(item));
        }
      }
      return result;
    }
    return null;
  }

  private setNodeValue(field: FormulaField, result: unknown): void {
    const { node } = field;
    const defaultValue = node.defaultValue;

    if (result === null || result === undefined) {
      node.setValue(defaultValue, { internal: true });
      return;
    }

    if (
      typeof result === 'number' &&
      (Number.isNaN(result) || !Number.isFinite(result))
    ) {
      node.setValue(defaultValue, { internal: true });
      return;
    }

    node.setValue(result, { internal: true });
  }

  private checkForWarnings(field: FormulaField, result: unknown): void {
    const { node } = field;

    if (typeof result === 'number') {
      if (Number.isNaN(result)) {
        node.setFormulaWarning({
          type: 'nan',
          message: 'Formula result is NaN',
          expression: field.expression,
          computedValue: result,
        });
        return;
      }

      if (!Number.isFinite(result)) {
        node.setFormulaWarning({
          type: 'infinity',
          message: 'Formula result is Infinity',
          expression: field.expression,
          computedValue: result,
        });
        return;
      }
    }

    node.setFormulaWarning(null);
  }

  private handleError(field: FormulaField, error: Error): void {
    const { node } = field;

    node.setValue(node.defaultValue, { internal: true });

    node.setFormulaWarning({
      type: 'runtime-error',
      message: error.message,
      expression: field.expression,
      computedValue: undefined,
    });

    if (this.options.onError) {
      this.options.onError(node, error);
    }
  }
}
