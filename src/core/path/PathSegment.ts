import type { PathSegment } from './types.js';

export class PropertySegment implements PathSegment {
  constructor(private readonly name: string) {}

  isProperty(): boolean {
    return true;
  }

  isItems(): boolean {
    return false;
  }

  propertyName(): string {
    return this.name;
  }

  equals(other: PathSegment): boolean {
    return other.isProperty() && other.propertyName() === this.name;
  }
}

export class ItemsSegment implements PathSegment {
  isProperty(): boolean {
    return false;
  }

  isItems(): boolean {
    return true;
  }

  propertyName(): string {
    throw new Error('Items segment has no property name');
  }

  equals(other: PathSegment): boolean {
    return other.isItems();
  }
}
