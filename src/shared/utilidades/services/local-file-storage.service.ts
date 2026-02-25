import { Injectable } from '@nestjs/common';
import { mkdir, writeFile } from 'fs/promises';
import { randomUUID } from 'crypto';
import { join, posix } from 'path';
import {
  FileStorageConflictError,
  InvalidFileStoragePathError
} from 'src/shared/application/errors/file-storage.errors';
import { FileStorage } from 'src/shared/application/ports/file-storage.port';

@Injectable()
export class LocalFileStorageService implements FileStorage {
  async save(params: {
    directory: string;
    buffer: Buffer;
    extension: string;
    filenamePrefix?: string;
    filename?: string;
  }): Promise<{ filename: string; relativePath: string }> {
    if (!params.buffer || params.buffer.length === 0) {
      throw new InvalidFileStoragePathError('No se puede guardar un archivo vacio');
    }

    const baseDir = join(process.cwd(), 'assets');
    const safeDirectory = this.sanitizeDirectory(params.directory);
    const safeFilename = this.sanitizeFilename(
      params.filename ?? this.buildFilename(params.filenamePrefix, params.extension)
    );
    const targetDir = join(baseDir, safeDirectory);
    await mkdir(targetDir, { recursive: true });

    const absolutePath = join(targetDir, safeFilename);
    try {
      await writeFile(absolutePath, params.buffer, { flag: 'wx' });
    } catch (error: any) {
      if (error?.code === 'EEXIST') {
        throw new FileStorageConflictError('Ya existe un archivo con ese nombre');
      }
      throw error;
    }

    return {
      filename: safeFilename,
      relativePath: posix.join('/api/assets', safeDirectory, safeFilename),
    };
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

    const normalized = posix.normalize(directory.replace(/\\/g, '/')).replace(/^\/+/, '');
    if (!normalized || normalized === '.' || normalized.startsWith('..') || normalized.includes('/../')) {
      throw new InvalidFileStoragePathError('Directorio invalido');
    }

    const segments = normalized.split('/');
    for (const segment of segments) {
      if (!segment || segment === '.' || segment === '..' || !/^[a-zA-Z0-9_-]+$/.test(segment)) {
        throw new InvalidFileStoragePathError('Directorio invalido');
      }
    }

    return segments.join('/');
  }

  private sanitizeFilename(filename: string) {
    if (!filename || filename.includes('/') || filename.includes('\\') || filename.includes('..')) {
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
    const normalized = value.replace(/[^a-zA-Z0-9_-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    return normalized || 'file';
  }
}
