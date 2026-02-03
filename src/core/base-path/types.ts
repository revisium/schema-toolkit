export interface BasePathSegment {
  equals(other: BasePathSegment): boolean;
}

export interface BasePath<TSegment extends BasePathSegment, TSelf extends BasePath<TSegment, TSelf>> {
  segments(): readonly TSegment[];
  parent(): TSelf;
  equals(other: TSelf): boolean;
  isEmpty(): boolean;
  length(): number;
  isChildOf(parent: TSelf): boolean;
}
