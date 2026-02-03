import type { BasePath, BasePathSegment } from '../base-path/types.js';

export interface PathSegment extends BasePathSegment {
  isProperty(): boolean;
  isItems(): boolean;
  propertyName(): string;
  equals(other: PathSegment): boolean;
}

export interface Path extends BasePath<PathSegment, Path> {
  asJsonPointer(): string;
  asSimple(): string;
  child(name: string): Path;
  childItems(): Path;
}
