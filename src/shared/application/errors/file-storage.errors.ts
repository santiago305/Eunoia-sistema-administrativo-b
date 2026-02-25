export class InvalidFileStoragePathError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidFileStoragePathError';
  }
}

export class FileStorageConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FileStorageConflictError';
  }
}
