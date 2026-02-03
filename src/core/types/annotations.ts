export type AnnotationType =
  | 'observable'
  | 'observable.ref'
  | 'observable.shallow'
  | 'computed'
  | 'action';

export type AnnotationsMap<T> = {
  [K in keyof T]?: AnnotationType;
};
