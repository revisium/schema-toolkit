import type { SchemaNode, NodeMetadata } from '../../core/schema-node/index.js';
import type { SchemaTree } from '../../core/schema-tree/index.js';
import { createSchemaTree } from '../../core/schema-tree/index.js';
import type { Path } from '../../core/path/index.js';
import { PatchBuilder, type SchemaPatch, type JsonPatch } from '../../core/schema-patch/index.js';
import { SchemaSerializer } from '../../core/schema-serializer/index.js';
import type { JsonObjectSchema } from '../../types/index.js';
import type { ReactivityAdapter } from '../../core/reactivity/index.js';
import type { AnnotationsMap } from '../../core/types/index.js';
import type { SchemaModel, ReactivityOptions, FieldType } from './types.js';
import { SchemaParser } from './SchemaParser.js';
import { NodeFactory } from './NodeFactory.js';
import { ParsedFormula, FormulaDependencyIndex } from '../schema-formula/index.js';
import { generateDefaultValue as generateDefaultValueFn } from '../default-value/index.js';

export class SchemaModelImpl implements SchemaModel {
  private _baseTree: SchemaTree;
  private _currentTree: SchemaTree;
  private readonly _reactivity: ReactivityAdapter | undefined;
  private readonly _patchBuilder = new PatchBuilder();
  private readonly _serializer = new SchemaSerializer();
  private readonly _nodeFactory = new NodeFactory();
  private readonly _formulaIndex = new FormulaDependencyIndex();

  constructor(schema: JsonObjectSchema, options?: ReactivityOptions) {
    const parser = new SchemaParser();
    const rootNode = parser.parse(schema);
    this._currentTree = createSchemaTree(rootNode);
    parser.parseFormulas(this._currentTree);
    this._buildFormulaIndex();
    this._baseTree = this._currentTree.clone();
    this._reactivity = options?.reactivity;

    if (this._reactivity) {
      this._reactivity.makeObservable(this, {
        _currentTree: 'observable.ref',
        _baseTree: 'observable.ref',
        root: 'computed',
        isDirty: 'computed',
        getPatches: 'computed',
        getJsonPatches: 'computed',
        getPlainSchema: 'computed',
        addField: 'action',
        removeField: 'action',
        renameField: 'action',
        changeFieldType: 'action',
        updateMetadata: 'action',
        updateFormula: 'action',
        updateForeignKey: 'action',
        updateDefaultValue: 'action',
        markAsSaved: 'action',
        revert: 'action',
      } as AnnotationsMap<this>);
    }
  }

  root(): SchemaNode {
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

  changeFieldType(nodeId: string, newType: FieldType): SchemaNode {
    const node = this._currentTree.nodeById(nodeId);
    if (node.isNull()) {
      return node;
    }

    const path = this._currentTree.pathOf(nodeId);
    if (path.isEmpty()) {
      return node;
    }

    const newNode = this._nodeFactory.createNode(node.name(), newType);
    this._currentTree.setNodeAt(path, newNode);
    this._currentTree.trackReplacement(nodeId, newNode.id());

    return newNode;
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

    if (expression === undefined) {
      node.setFormula(undefined);
      this._formulaIndex.unregisterFormula(nodeId);
    } else {
      const formula = new ParsedFormula(this._currentTree, nodeId, expression);
      node.setFormula(formula);
      this._formulaIndex.registerFormula(nodeId, formula);
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

  isDirty(): boolean {
    return this.getPatches().length > 0;
  }

  isValid(): boolean {
    return this._currentTree.root().isObject();
  }

  getPatches(): SchemaPatch[] {
    return this._patchBuilder.build(this._currentTree, this._baseTree);
  }

  getJsonPatches(): JsonPatch[] {
    return this.getPatches().map((p) => p.patch);
  }

  markAsSaved(): void {
    this._baseTree = this._currentTree.clone();
  }

  revert(): void {
    this._currentTree = this._baseTree.clone();
  }

  getPlainSchema(): JsonObjectSchema {
    return this._serializer.serializeTree(this._currentTree);
  }

  generateDefaultValue(options?: { arrayItemCount?: number }): unknown {
    return generateDefaultValueFn(this.getPlainSchema(), options);
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
  options?: ReactivityOptions,
): SchemaModel {
  return new SchemaModelImpl(schema, options);
}
