import { SaveStoredFileInput, StorageArea, StoredFileRef } from './storage-file';

export const FILE_STORAGE = Symbol('FILE_STORAGE');

export interface FileStorage {
  save(params: SaveStoredFileInput): Promise<StoredFileRef>;

  read(keyOrPath: string): Promise<Buffer>;
  exists(keyOrPath: string): Promise<boolean>;
  /** Read-only inventory of files below a storage directory. */
  list?(area: StorageArea, directory: string): Promise<string[]>;
  delete(keyOrPath: string): Promise<boolean>;
  moveToDeleted(
    keyOrPath: string,
    targetDirectory: string,
  ): Promise<StoredFileRef | null>;
  /** Move a stored file to an explicit relative storage key for rollback. */
  move?(sourceKey: string, targetKey: string): Promise<StoredFileRef | null>;
  resolve(keyOrPath: string): StoredFileRef;
}
