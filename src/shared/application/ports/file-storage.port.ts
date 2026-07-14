import { SaveStoredFileInput, StoredFileRef } from './storage-file';

export const FILE_STORAGE = Symbol('FILE_STORAGE');

export interface FileStorage {
  save(params: SaveStoredFileInput): Promise<StoredFileRef>;

  read(keyOrPath: string): Promise<Buffer>;
  exists(keyOrPath: string): Promise<boolean>;
  delete(keyOrPath: string): Promise<boolean>;
  moveToDeleted(
    keyOrPath: string,
    targetDirectory: string,
  ): Promise<StoredFileRef | null>;
  resolve(keyOrPath: string): StoredFileRef;
}
