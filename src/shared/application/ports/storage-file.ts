export type StorageArea = 'public' | 'private' | 'deleted';

export type SaveStoredFileInput = {
  area?: StorageArea;
  directory: string;
  buffer: Buffer;
  extension: string;
  filenamePrefix?: string;
  filename?: string;
};

export type StoredFileRef = {
  area: StorageArea;
  key: string;
  filename: string;
  relativePath: string;
  publicUrl: string | null;
  absolutePath: string;
};
