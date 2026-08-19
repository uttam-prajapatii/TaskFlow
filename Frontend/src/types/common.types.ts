export type Nullable<T> = T | null;

export type AsyncStatus = 'idle' | 'loading' | 'success' | 'error';

export interface BaseEntity {
  _id: string;
  createdAt?: string;
  updatedAt?: string;
}
