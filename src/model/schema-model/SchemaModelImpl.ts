import type { SchemaNode, NodeMetadata } from '../../core/schema-node/index.js';
import { NULL_NODE } from '../../core/schema-node/index.js';
import type { SchemaTree } from '../../core/schema-tree/index.js';
import { createSchemaTree } from '../../core/schema-tree/index.js';
import type { Path, PathSegment } from '../../core/path/index.js';
import { PatchBuilder, type SchemaPatch, type JsonPatch } from '../../core/schema-patch/index.js';
import { SchemaSerializer } from '../../core/schema-serializer/index.js';
import type { JsonObjectSchema } from '../../types/index.js';
import { makeAutoObservable } from '../../core/reactivity/index.js';
import type { SchemaModel, FieldType, FieldTypeSpec, ReplaceResult, SchemaModelOptions, RefSchemas } from './types.js';
import { SchemaParser } from './SchemaParser.js';
import { NodeFactory } from './NodeFactory.js';
import { ParsedFormula, FormulaDependencyIndex, FormulaSerializer } from '../schema-formula/index.js';
import {
  validateSchema,
  validateFormulas,
  type SchemaValidationError,
  type TreeFormulaValidationError,
} from '../../core/validation/index.js';
import { generateDefaultValue as generateDefaultValueFn } from '../default-value/index.js';
import { TypeTransformChain } from '../type-transformer/index.js';

export class SchemaModelImpl implements SchemaModel {
  private _baseTree: SchemaTree;
  private _currentTree: SchemaTree;
  private readonly _patchBuilder = new PatchBuilder();
  private readonly _serializer = new SchemaSerializer();
  private readonly _nodeFactory = new NodeFactory();
  private readonly _formulaIndex = new FormulaDependencyIndex();
  private readonly _transformChain: TypeTransformChain;
  private _formulaParseErrors: TreeFormulaValidationError[] = [];
  private readonly _refSchemas: RefSchemas | undefined;

  constructor(schema: JsonObjectSchema, options?: SchemaModelOptions) {
    this._refSchemas = options?.refSchemas;
    this._transformChain = new TypeTransformChain({
      refSchemas: this._refSchemas,
      customTransformers: options?.customTransformers,
    });
    const parser = new SchemaParser();
    const rootNode = parser.parse(schema, this._refSchemas);
    this._currentTree = createSchemaTree(rootNode);
    parser.parseFormulas(this._currentTree);
    this._formulaParseErrors = parser.parseErrors;
    this._buildFormulaIndex();
    this._baseTree = this._currentTree.clone();

    makeAutoObservable(this, {
      _patchBuilder: false,
      _serializer: false,
      _nodeFactory: false,
      _formulaIndex: false,
      _transformChain: false,
      _refSchemas: false,
      _currentTree: 'observable.ref',
      _baseTree: 'observable.ref',
      _formulaParseErrors: 'observable.ref',
    });
  }

  get root(): SchemaNode {
    return this._currentTree.root();
  }

  nodeById(id: string): SchemaNode {
    return this._currentTree.nodeById(id);
  }

  pathOf(id: string): Path {
    return this._currentTree.pathOf(id);
  }

  addField(parentId: string, name: string, type: FieldType): SchemaNode {
    const node = this._nodeFactory.createNode(name, type);
    this._currentTree.addChildTo(parentId, node);
    return node;
  }

  insertFieldAt(parentId: string, index: number, name: string, type: FieldType): SchemaNode {
    const parent = this._currentTree.nodeById(parentId);
    if (parent.isNull() || !parent.isObject()) {
      return NULL_NODE;
    }
    const node = this._nodeFactory.createNode(name, type);
    this._currentTree.insertChildAt(parentId, index, node);
    return node;
  }

  removeField(nodeId: string): boolean {
    const path = this._currentTree.pathOf(nodeId);
    if (path.isEmpty()) {
      return false;
    }
    return this._currentTree.removeNodeAt(path);
  }

  renameField(nodeId: string, newName: string): void {
    const node = this._currentTree.nodeById(nodeId);
    if (node.isNull()) {
      return;
    }
    this._currentTree.renameNode(nodeId, newName);
  }

  changeFieldType(nodeId: string, newType: FieldTypeSpec): SchemaNode {
    const node = this._currentTree.nodeById(nodeId);
    if (node.isNull()) {
      return node;
    }

    const path = this._currentTree.pathOf(nodeId);
    if (path.isEmpty()) {
      return node;
    }

    const result = this._transformChain.transform(node, newType);
    this._currentTree.setNodeAt(path, result.node);
    this._currentTree.trackReplacement(nodeId, result.node.id());

    return result.node;
  }

  updateMetadata(nodeId: string, meta: Partial<NodeMetadata>): void {
    const node = this._currentTree.nodeById(nodeId);
    if (node.isNull()) {
      return;
    }

    const currentMeta = node.metadata();
    const newMeta: NodeMetadata = {
      ...currentMeta,
      ...meta,
    };

    node.setMetadata(newMeta);
  }

  updateFormula(nodeId: string, expression: string | undefined): void {
    const node = this._currentTree.nodeById(nodeId);
    if (node.isNull()) {
      return;
    }

    this._formulaParseErrors = this._formulaParseErrors.filter((e) => e.nodeId !== nodeId);

    if (expression === undefined) {
      node.setFormula(undefined);
      this._formulaIndex.unregisterFormula(nodeId);
    } else {
      try {
        const formula = new ParsedFormula(this._currentTree, nodeId, expression);
        node.setFormula(formula);
        this._formulaIndex.registerFormula(nodeId, formula);
      } catch (error) {
        this._formulaParseErrors = [
          ...this._formulaParseErrors,
          { nodeId, message: (error as Error).message },
        ];
      }
    }
  }

  updateForeignKey(nodeId: string, foreignKey: string | undefined): void {
    const node = this._currentTree.nodeById(nodeId);
    if (node.isNull()) {
      return;
    }
    node.setForeignKey(foreignKey);
  }

  updateDefaultValue(nodeId: string, value: unknown): void {
    const node = this._currentTree.nodeById(nodeId);
    if (node.isNull()) {
      return;
    }
    node.setDefaultValue(value);
  }

  wrapInArray(nodeId: string): ReplaceResult | null {
    const node = this._currentTree.nodeById(nodeId);
    if (node.isNull() || node.isArray()) {
      return null;
    }

    const path = this._currentTree.pathOf(nodeId);
    if (path.isEmpty()) {
      return null;
    }

    const name = node.name();
    const arrayNode = this._nodeFactory.createArrayNodeWithItems(name, node);
    this._currentTree.setNodeAt(path, arrayNode);
    node.setName('');
    this._currentTree.trackReplacement(nodeId, arrayNode.id());

    return {
      replacedNodeId: nodeId,
      newNodeId: arrayNode.id(),
    };
  }

  wrapRootInArray(): ReplaceResult | null {
    const currentRoot = this._currentTree.root();
    if (currentRoot.isArray()) {
      return null;
    }

    const oldId = currentRoot.id();
    const name = currentRoot.name();
    currentRoot.setName('');
    const arrayNode = this._nodeFactory.createArrayNodeWithItems(name, currentRoot);
    this._currentTree.replaceRoot(arrayNode);
    this._currentTree.trackReplacement(oldId, arrayNode.id());

    return {
      replacedNodeId: oldId,
      newNodeId: arrayNode.id(),
    };
  }

  replaceRoot(newType: FieldType): ReplaceResult | null {
    const currentRoot = this._currentTree.root();
    const oldId = currentRoot.id();
    const name = currentRoot.name();

    const newRoot = this._nodeFactory.createNode(name, newType);
    this._currentTree.replaceRoot(newRoot);
    this._currentTree.trackReplacement(oldId, newRoot.id());
    this._buildFormulaIndex();

    return {
      replacedNodeId: oldId,
      newNodeId: newRoot.id(),
    };
  }

  canMoveNode(nodeId: string, targetParentId: string): boolean {
    if (nodeId === targetParentId) {
      return false;
    }

    const node = this._currentTree.nodeById(nodeId);
    if (node.isNull()) {
      return false;
    }

    const target = this._currentTree.nodeById(targetParentId);
    if (target.isNull()) {
      return false;
    }

    if (!target.isObject()) {
      return false;
    }

    const nodePath = this._currentTree.pathOf(nodeId);
    if (nodePath.isEmpty()) {
      return false;
    }

    const targetPath = this._currentTree.pathOf(targetParentId);
    if (targetPath.equals(nodePath) || targetPath.isChildOf(nodePath)) {
      return false;
    }

    const nodeParentPath = nodePath.parent();
    if (targetPath.equals(nodeParentPath)) {
      return false;
    }

    if (this.isMovingOutOfArray(nodePath, targetPath)) {
      return false;
    }

    return true;
  }

  private isMovingOutOfArray(fromPath: Path, toPath: Path): boolean {
    const fromSegments = fromPath.segments();
    const toSegments = toPath.segments();

    for (let i = 0; i < fromSegments.length; i++) {
      const fromSeg = fromSegments[i];
      if (fromSeg?.isItems()) {
        if (!toSegments[i]?.isItems()) {
          return true;
        }
        if (this.hasPathPrefixMismatch(fromSegments, toSegments, i)) {
          return true;
        }
      }
    }
    return false;
  }

  private hasPathPrefixMismatch(
    fromSegments: readonly PathSegment[],
    toSegments: readonly PathSegment[],
    endIndex: number,
  ): boolean {
    for (let j = 0; j < endIndex; j++) {
      const fromSeg = fromSegments[j];
      const toSeg = toSegments[j];
      if (!fromSeg || !toSeg || !fromSeg.equals(toSeg)) {
        return true;
      }
    }
    return false;
  }

  hasValidDropTarget(nodeId: string): boolean {
    const node = this._currentTree.nodeById(nodeId);
    if (node.isNull()) {
      return false;
    }

    const nodePath = this._currentTree.pathOf(nodeId);
    if (nodePath.isEmpty()) {
      return false;
    }

    for (const candidateId of this._currentTree.nodeIds()) {
      if (this.canMoveNode(nodeId, candidateId)) {
        return true;
      }
    }

    return false;
  }

  moveNode(nodeId: string, targetParentId: string): void {
    if (!this.canMoveNode(nodeId, targetParentId)) {
      return;
    }
    this._currentTree.moveNode(nodeId, targetParentId);
  }

  getFormulaDependents(nodeId: string): readonly string[] {
    return this._formulaIndex.getDependents(nodeId);
  }

  hasFormulaDependents(nodeId: string): boolean {
    return this._formulaIndex.hasDependents(nodeId);
  }

  serializeFormula(nodeId: string): string {
    const node = this._currentTree.nodeById(nodeId);
    if (node.isNull()) {
      return '';
    }
    const formula = node.formula();
    if (!formula) {
      return '';
    }
    return FormulaSerializer.serializeExpression(
      this._currentTree,
      nodeId,
      formula,
      { strict: false },
    );
  }

  get validationErrors(): SchemaValidationError[] {
    return validateSchema(this._currentTree.root());
  }

  get formulaErrors(): TreeFormulaValidationError[] {
    return [...this._formulaParseErrors, ...validateFormulas(this._currentTree)];
  }

  get isDirty(): boolean {
    return this.patches.length > 0;
  }

  get isValid(): boolean {
    return (
      this._currentTree.root().isObject() &&
      this.validationErrors.length === 0 &&
      this.formulaErrors.length === 0
    );
  }

  get patches(): SchemaPatch[] {
    return this._patchBuilder.build(this._currentTree, this._baseTree);
  }

  get jsonPatches(): JsonPatch[] {
    return this.patches.map((p) => p.patch);
  }

  markAsSaved(): void {
    this._baseTree = this._currentTree.clone();
  }

  revert(): void {
    this._currentTree = this._baseTree.clone();
  }

  get plainSchema(): JsonObjectSchema {
    return this._serializer.serializeTree(this._currentTree);
  }

  get nodeCount(): number {
    return this._currentTree.countNodes();
  }

  get refSchemas(): RefSchemas | undefined {
    return this._refSchemas;
  }

  generateDefaultValue(options?: { arrayItemCount?: number }): unknown {
    return generateDefaultValueFn(this.plainSchema, {
      ...options,
      refSchemas: this._refSchemas,
    });
  }

  private _buildFormulaIndex(): void {
    this._formulaIndex.clear();
    for (const nodeId of this._currentTree.nodeIds()) {
      const node = this._currentTree.nodeById(nodeId);
      const formula = node.formula();
      if (formula) {
        this._formulaIndex.registerFormula(nodeId, formula);
      }
    }
  }
}

export function createSchemaModel(
  schema: JsonObjectSchema,
  options?: SchemaModelOptions,
): SchemaModel {
  return new SchemaModelImpl(schema, options);
}
