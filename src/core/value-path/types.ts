import type { BasePath, BasePathSegment } from '../base-path/types.js';

export interface ValuePathSegment extends BasePathSegment {
  isProperty(): boolean;
  isIndex(): boolean;
  propertyName(): string;
  indexValue(): number;
  equals(other: ValuePathSegment): boolean;
}

export interface ValuePath extends BasePath<ValuePathSegment, ValuePath> {
  asString(): string;
  asJsonPointer(): string;
  child(name: string): ValuePath;
  childIndex(index: number): ValuePath;
}
