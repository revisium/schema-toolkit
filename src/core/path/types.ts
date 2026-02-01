export interface PathSegment {
  isProperty(): boolean;
  isItems(): boolean;
  propertyName(): string;
  equals(other: PathSegment): boolean;
}

export interface Path {
  segments(): readonly PathSegment[];
  asJsonPointer(): string;
  asSimple(): string;
  parent(): Path;
  child(name: string): Path;
  childItems(): Path;
  equals(other: Path): boolean;
  isEmpty(): boolean;
  length(): number;
  isChildOf(parent: Path): boolean;
}
