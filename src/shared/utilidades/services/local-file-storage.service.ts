import { Injectable } from '@nestjs/common';
import { access, mkdir, readFile, rename, rm, writeFile } from 'fs/promises';
import { randomUUID } from 'crypto';
import { isAbsolute, join, posix, relative, resolve, sep } from 'path';
import { envs } from 'src/infrastructure/config/envs';
import {
  FileStorageConflictError,
  InvalidFileStoragePathError,
} from 'src/shared/application/errors/file-storage.errors';
import { FileStorage } from 'src/shared/application/ports/file-storage.port';
import {
  SaveStoredFileInput,
  StorageArea,
  StoredFileRef,
} from 'src/shared/application/ports/storage-file';

@Injectable()
export class LocalFileStorageService implements FileStorage {
  async save(params: SaveStoredFileInput): Promise<StoredFileRef> {
    if (!params.buffer || params.buffer.length === 0) {
      throw new InvalidFileStoragePathError(
        'No se puede guardar un archivo vacio',
      );
    }

    const area = params.area ?? 'public';
    const baseDir = this.areaRoot(area);
    const safeDirectory = this.sanitizeDirectory(params.directory);
    const safeFilename = this.sanitizeFilename(
      params.filename ??
        this.buildFilename(params.filenamePrefix, params.extension),
    );
    const targetDir = join(baseDir, safeDirectory);
    await mkdir(targetDir, { recursive: true });

    const absolutePath = join(targetDir, safeFilename);
    this.assertInside(baseDir, absolutePath, 'Ruta de archivo invalida');

    try {
      await writeFile(absolutePath, params.buffer, { flag: 'wx' });
    } catch (error: any) {
      if (error?.code === 'EEXIST') {
        throw new FileStorageConflictError(
          'Ya existe un archivo con ese nombre',
        );
      }
      throw error;
    }

    return this.toStoredFileRef(
      area,
      safeDirectory,
      safeFilename,
      absolutePath,
    );
  }

  async read(keyOrPath: string): Promise<Buffer> {
    return readFile(this.resolve(keyOrPath).absolutePath);
  }

  async exists(keyOrPath: string): Promise<boolean> {
    try {
      await access(this.resolve(keyOrPath).absolutePath);
      return true;
    } catch (error: any) {
      if (error?.code === 'ENOENT') {
        return false;
      }
      throw error;
    }
  }

  async delete(keyOrPath: string): Promise<boolean> {
    const { absolutePath } = this.resolve(keyOrPath);
    try {
      await rm(absolutePath, { force: false });
      return true;
    } catch (error: any) {
      if (error?.code === 'ENOENT') {
        return false;
      }
      throw error;
    }
  }

  async moveToDeleted(
    keyOrPath: string,
    targetDirectory: string,
  ): Promise<StoredFileRef | null> {
    const source = this.resolve(keyOrPath);
    const safeDirectory = this.sanitizeDirectory(targetDirectory);
    const deletedRoot = this.areaRoot('deleted');
    const targetDir = join(deletedRoot, safeDirectory);
    const targetPath = join(targetDir, source.filename);
    this.assertInside(deletedRoot, targetPath, 'Ruta de archivo invalida');

    await mkdir(targetDir, { recursive: true });

    try {
      await rename(source.absolutePath, targetPath);
    } catch (error: any) {
      if (error?.code === 'ENOENT') {
        return null;
      }
      if (error?.code === 'EEXIST') {
        throw new FileStorageConflictError(
          'Ya existe un archivo con ese nombre',
        );
      }
      throw error;
    }

    return this.toStoredFileRef(
      'deleted',
      safeDirectory,
      source.filename,
      targetPath,
    );
  }

  resolve(keyOrPath: string): StoredFileRef {
    if (!keyOrPath) {
      throw new InvalidFileStoragePathError('Ruta de archivo invalida');
    }

    const normalizedInput = keyOrPath.replace(/\\/g, '/');

    if (normalizedInput.startsWith('/api/assets/')) {
      return this.resolveStorageKey(
        `public/${normalizedInput.replace(/^\/api\/assets\//, '')}`,
      );
    }

    if (normalizedInput.startsWith('/assets/')) {
      return this.resolveStorageKey(
        `public/${normalizedInput.replace(/^\/assets\//, '')}`,
      );
    }

    if (/^(public|private|deleted)\//.test(normalizedInput)) {
      return this.resolveStorageKey(normalizedInput);
    }

    if (normalizedInput.startsWith('storage/mail-attachments/')) {
      return this.resolveStorageKey(
        `private/${normalizedInput.replace(/^storage\//, '')}`,
      );
    }

    if (isAbsolute(keyOrPath)) {
      return this.resolveAbsolutePath(keyOrPath);
    }

    throw new InvalidFileStoragePathError('Ruta de archivo invalida');
  }

  private buildFilename(prefix: string | undefined, extension: string) {
    const safePrefix = prefix ? this.sanitizeSimpleSegment(prefix) : 'file';
    const safeExtension = this.sanitizeExtension(extension);
    return `${safePrefix}-${Date.now()}-${randomUUID()}.${safeExtension}`;
  }

  private sanitizeDirectory(directory: string) {
    if (!directory) {
      throw new InvalidFileStoragePathError('El directorio es obligatorio');
    }

    const normalized = posix
      .normalize(directory.replace(/\\/g, '/'))
      .replace(/^\/+/, '');
    if (
      !normalized ||
      normalized === '.' ||
      normalized.startsWith('..') ||
      normalized.includes('/../')
    ) {
      throw new InvalidFileStoragePathError('Directorio invalido');
    }

    const segments = normalized.split('/');
    for (const segment of segments) {
      if (
        !segment ||
        segment === '.' ||
        segment === '..' ||
        !/^[a-zA-Z0-9_-]+$/.test(segment)
      ) {
        throw new InvalidFileStoragePathError('Directorio invalido');
      }
    }

    return segments.join('/');
  }

  private sanitizeFilename(filename: string) {
    if (
      !filename ||
      filename.includes('/') ||
      filename.includes('\\') ||
      filename.includes('..')
    ) {
      throw new InvalidFileStoragePathError('Nombre de archivo invalido');
    }

    if (!/^[a-zA-Z0-9._-]+$/.test(filename)) {
      throw new InvalidFileStoragePathError('Nombre de archivo invalido');
    }

    return filename;
  }

  private sanitizeExtension(extension: string) {
    const normalized = extension.replace(/^\./, '').toLowerCase();
    if (!/^[a-z0-9]+$/.test(normalized)) {
      throw new InvalidFileStoragePathError('Extension invalida');
    }
    return normalized;
  }

  private sanitizeSimpleSegment(value: string) {
    const normalized = value
      .replace(/[^a-zA-Z0-9_-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    return normalized || 'file';
  }

  private areaRoot(area: StorageArea) {
    const areaRoots: Record<StorageArea, string> = {
      public: envs.files.publicDir,
      private: envs.files.privateDir,
      deleted: envs.files.deletedDir,
    };

    return this.resolveFromCwd(areaRoots[area]);
  }

  private resolveStorageKey(key: string): StoredFileRef {
    const normalized = posix.normalize(key.replace(/^\/+/, ''));
    const [areaCandidate, ...pathSegments] = normalized.split('/');
    const area = this.parseArea(areaCandidate);
    const filename = pathSegments.at(-1);

    if (
      !filename ||
      pathSegments.length < 2 ||
      normalized.startsWith('..') ||
      normalized.includes('/../')
    ) {
      throw new InvalidFileStoragePathError('Ruta de archivo invalida');
    }

    const safeFilename = this.sanitizeFilename(filename);
    const directory = this.sanitizeDirectory(
      pathSegments.slice(0, -1).join('/'),
    );
    const baseDir = this.areaRoot(area);
    const absolutePath = join(baseDir, directory, safeFilename);
    this.assertInside(baseDir, absolutePath, 'Ruta de archivo invalida');

    return this.toStoredFileRef(area, directory, safeFilename, absolutePath);
  }

  private resolveAbsolutePath(input: string): StoredFileRef {
    const absolutePath = resolve(input);
    const storageRoots: Array<{ area: StorageArea; root: string }> = [
      { area: 'public', root: this.areaRoot('public') },
      { area: 'private', root: this.areaRoot('private') },
      { area: 'deleted', root: this.areaRoot('deleted') },
      { area: 'public', root: this.resolveFromCwd('assets') },
    ];

    for (const { area, root } of storageRoots) {
      if (this.isInside(root, absolutePath)) {
        const relativePath = this.toPosix(relative(root, absolutePath));
        const filename = this.sanitizeFilename(posix.basename(relativePath));
        const directory = this.sanitizeDirectory(posix.dirname(relativePath));
        return this.toStoredFileRef(area, directory, filename, absolutePath);
      }
    }

    throw new InvalidFileStoragePathError('Ruta de archivo invalida');
  }

  private toStoredFileRef(
    area: StorageArea,
    directory: string,
    filename: string,
    absolutePath: string,
  ): StoredFileRef {
    const key = posix.join(area, directory, filename);
    const publicUrl =
      area === 'public' ? posix.join('/api/assets', directory, filename) : null;

    return {
      area,
      key,
      filename,
      relativePath: publicUrl ?? key,
      publicUrl,
      absolutePath,
    };
  }

  private parseArea(value: string): StorageArea {
    if (value === 'public' || value === 'private' || value === 'deleted') {
      return value;
    }

    throw new InvalidFileStoragePathError('Ruta de archivo invalida');
  }

  private resolveFromCwd(pathValue: string) {
    return isAbsolute(pathValue)
      ? resolve(pathValue)
      : resolve(process.cwd(), pathValue);
  }

  private assertInside(root: string, target: string, message: string) {
    if (!this.isInside(root, target)) {
      throw new InvalidFileStoragePathError(message);
    }
  }

  private isInside(root: string, target: string) {
    const normalizedRoot = resolve(root);
    const normalizedTarget = resolve(target);
    const relativePath = relative(normalizedRoot, normalizedTarget);
    return (
      relativePath === '' ||
      (!relativePath.startsWith('..') && !isAbsolute(relativePath))
    );
  }

  private toPosix(value: string) {
    return value.split(sep).join('/');
  }
}
