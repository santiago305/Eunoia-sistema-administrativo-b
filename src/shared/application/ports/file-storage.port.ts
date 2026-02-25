export const FILE_STORAGE = Symbol('FILE_STORAGE');

export interface FileStorage {
  save(params: {
    directory: string;
    buffer: Buffer;
    extension: string;
    filenamePrefix?: string;
    filename?: string;
  }): Promise<{
    filename: string;
    relativePath: string;
  }>;
}
