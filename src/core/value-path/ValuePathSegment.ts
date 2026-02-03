import type { ValuePathSegment } from './types.js';

export class PropertySegment implements ValuePathSegment {
  constructor(private readonly name: string) {}

  isProperty(): boolean {
    return true;
  }

  isIndex(): boolean {
    return false;
  }

  propertyName(): string {
    return this.name;
  }

  indexValue(): number {
    throw new Error('Property segment has no index value');
  }

  equals(other: ValuePathSegment): boolean {
    return other.isProperty() && other.propertyName() === this.name;
  }
}

export class IndexSegment implements ValuePathSegment {
  constructor(private readonly index: number) {}

  isProperty(): boolean {
    return false;
  }

  isIndex(): boolean {
    return true;
  }

  propertyName(): string {
    throw new Error('Index segment has no property name');
  }

  indexValue(): number {
    return this.index;
  }

  equals(other: ValuePathSegment): boolean {
    return other.isIndex() && other.indexValue() === this.index;
  }
}
