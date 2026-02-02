export interface ValuePathSegment {
  isProperty(): boolean;
  isIndex(): boolean;
  propertyName(): string;
  indexValue(): number;
  equals(other: ValuePathSegment): boolean;
}

export interface ValuePath {
  segments(): readonly ValuePathSegment[];
  asString(): string;
  parent(): ValuePath;
  child(name: string): ValuePath;
  childIndex(index: number): ValuePath;
  equals(other: ValuePath): boolean;
  isEmpty(): boolean;
  length(): number;
  isChildOf(parent: ValuePath): boolean;
}
