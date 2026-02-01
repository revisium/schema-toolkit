export type AnnotationType = 'observable' | 'computed' | 'action';

export type AnnotationsMap<T> = {
  [K in keyof T]?: AnnotationType;
};
