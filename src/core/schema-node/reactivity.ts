import type { SchemaNode, NodeType } from './types.js';
import type { ReactivityAdapter } from '../reactivity/index.js';
import type { AnnotationType } from '../types/index.js';

type NodeAnnotations = Record<string, AnnotationType>;

const BASE_NODE_ANNOTATIONS: NodeAnnotations = {
  _name: 'observable',
  _metadata: 'observable.ref',
  setName: 'action',
  setMetadata: 'action',
};

const PRIMITIVE_NODE_ANNOTATIONS: NodeAnnotations = {
  ...BASE_NODE_ANNOTATIONS,
  _formula: 'observable.ref',
  _defaultValue: 'observable',
  _foreignKey: 'observable',
  setFormula: 'action',
  setDefaultValue: 'action',
  setForeignKey: 'action',
};

const STRING_NODE_ANNOTATIONS: NodeAnnotations = {
  ...PRIMITIVE_NODE_ANNOTATIONS,
  _contentMediaType: 'observable',
  setContentMediaType: 'action',
};

const NUMBER_NODE_ANNOTATIONS: NodeAnnotations = {
  ...PRIMITIVE_NODE_ANNOTATIONS,
};

const BOOLEAN_NODE_ANNOTATIONS: NodeAnnotations = {
  ...PRIMITIVE_NODE_ANNOTATIONS,
};

const OBJECT_NODE_ANNOTATIONS: NodeAnnotations = {
  ...BASE_NODE_ANNOTATIONS,
  _children: 'observable.shallow',
  addChild: 'action',
  removeChild: 'action',
  replaceChild: 'action',
};

const ARRAY_NODE_ANNOTATIONS: NodeAnnotations = {
  ...BASE_NODE_ANNOTATIONS,
  _items: 'observable.ref',
  setItems: 'action',
};

const REF_NODE_ANNOTATIONS: NodeAnnotations = {
  ...BASE_NODE_ANNOTATIONS,
};

export function getNodeAnnotations(nodeType: NodeType): NodeAnnotations {
  switch (nodeType) {
    case 'string':
      return STRING_NODE_ANNOTATIONS;
    case 'number':
      return NUMBER_NODE_ANNOTATIONS;
    case 'boolean':
      return BOOLEAN_NODE_ANNOTATIONS;
    case 'object':
      return OBJECT_NODE_ANNOTATIONS;
    case 'array':
      return ARRAY_NODE_ANNOTATIONS;
    case 'ref':
      return REF_NODE_ANNOTATIONS;
    case 'null':
      return {};
    default:
      return {};
  }
}

export function makeNodeReactive(
  node: SchemaNode,
  adapter: ReactivityAdapter,
): void {
  if (node.isNull()) {
    return;
  }

  const annotations = getNodeAnnotations(node.nodeType());
  adapter.makeObservable(
    node,
    annotations as Record<
      string,
      'observable' | 'observable.ref' | 'observable.shallow' | 'computed' | 'action'
    >,
  );
}

export function makeTreeNodesReactive(
  root: SchemaNode,
  adapter: ReactivityAdapter,
): void {
  makeNodeReactive(root, adapter);

  if (root.isObject()) {
    for (const child of root.properties()) {
      makeTreeNodesReactive(child, adapter);
    }
  } else if (root.isArray()) {
    makeTreeNodesReactive(root.items(), adapter);
  }
}
