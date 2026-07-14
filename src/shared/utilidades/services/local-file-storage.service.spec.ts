import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { LocalFileStorageService } from './local-file-storage.service';

jest.mock('src/infrastructure/config/envs', () => ({
  envs: {
    files: {
      publicDir: 'storage/public',
      privateDir: 'storage/private',
      deletedDir: 'storage/deleted',
    },
  },
}));

describe('LocalFileStorageService', () => {
  let service: LocalFileStorageService;
  let cwdSpy: jest.SpyInstance<string, []>;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'local-file-storage-'));
    cwdSpy = jest.spyOn(process, 'cwd').mockReturnValue(tempDir);
    service = new LocalFileStorageService();
  });

  afterEach(async () => {
    cwdSpy.mockRestore();
    await rm(tempDir, { recursive: true, force: true });
  });

  it('saves public files under storage public and returns api assets url', async () => {
    const result = await service.save({
      area: 'public',
      directory: 'users',
      buffer: Buffer.from('image'),
      extension: 'webp',
      filename: 'avatar.webp',
    });

    expect(result.key).toBe('public/users/avatar.webp');
    expect(result.relativePath).toBe('/api/assets/users/avatar.webp');
    expect(result.publicUrl).toBe('/api/assets/users/avatar.webp');
    expect(result.absolutePath).toBe(
      join(tempDir, 'storage', 'public', 'users', 'avatar.webp'),
    );
  });

  it('saves private files without public url', async () => {
    const result = await service.save({
      area: 'private',
      directory: 'mail-attachments',
      buffer: Buffer.from('mail'),
      extension: 'pdf',
      filename: 'one.pdf',
    });

    expect(result.key).toBe('private/mail-attachments/one.pdf');
    expect(result.publicUrl).toBeNull();
  });

  it('rejects path traversal', async () => {
    await expect(
      service.save({
        area: 'private',
        directory: '../outside',
        buffer: Buffer.from('x'),
        extension: 'txt',
      }),
    ).rejects.toThrow('Directorio invalido');
  });

  it('resolves legacy mail attachment paths to private storage keys', () => {
    const result = service.resolve('storage/mail-attachments/one.pdf');

    expect(result.key).toBe('private/mail-attachments/one.pdf');
    expect(result.publicUrl).toBeNull();
    expect(result.absolutePath).toBe(
      join(tempDir, 'storage', 'private', 'mail-attachments', 'one.pdf'),
    );
  });
});
