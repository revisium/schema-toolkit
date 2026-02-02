export type AnnotationType = 'observable' | 'observable.ref' | 'computed' | 'action';

export type AnnotationsMap<T> = {
  [K in keyof T]?: AnnotationType;
};
