import { mkdir, mkdtemp, readFile, rm, stat, symlink, writeFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { migrateAssetsToStoragePublic } from './migrate-assets-to-storage-public';

describe('migrateAssetsToStoragePublic', () => {
  let rootDir: string;

  beforeEach(async () => {
    rootDir = await mkdtemp(join(tmpdir(), 'eunoia-assets-'));
  });

  afterEach(async () => {
    await rm(rootDir, { recursive: true, force: true });
  });

  it('copies legacy assets into storage public preserving paths', async () => {
    await mkdir(join(rootDir, 'assets/users'), { recursive: true });
    await writeFile(join(rootDir, 'assets/users/avatar.webp'), 'avatar');

    const result = await migrateAssetsToStoragePublic({ rootDir });

    await expect(
      readFile(join(rootDir, 'storage/public/users/avatar.webp'), 'utf8'),
    ).resolves.toBe('avatar');
    expect(result).toEqual({ copied: 1, skipped: 0, conflicts: [] });
  });

  it('skips files only when existing content has the same SHA-256', async () => {
    await mkdir(join(rootDir, 'assets/company'), { recursive: true });
    await mkdir(join(rootDir, 'storage/public/company'), { recursive: true });
    await writeFile(join(rootDir, 'assets/company/logo.png'), 'same');
    await writeFile(join(rootDir, 'storage/public/company/logo.png'), 'same');
    const before = await stat(join(rootDir, 'storage/public/company/logo.png'));

    const result = await migrateAssetsToStoragePublic({ rootDir });
    const after = await stat(join(rootDir, 'storage/public/company/logo.png'));

    expect(result).toEqual({ copied: 0, skipped: 1, conflicts: [] });
    expect(after.mtimeMs).toBe(before.mtimeMs);
  });

  it('reports same-size content collisions without overwriting either file', async () => {
    await mkdir(join(rootDir, 'assets/company'), { recursive: true });
    await mkdir(join(rootDir, 'storage/public/company'), { recursive: true });
    await writeFile(join(rootDir, 'assets/company/logo.png'), 'legacy');
    await writeFile(join(rootDir, 'storage/public/company/logo.png'), 'target');

    const result = await migrateAssetsToStoragePublic({ rootDir });

    expect(result).toEqual({ copied: 0, skipped: 0, conflicts: ['company/logo.png'] });
    await expect(readFile(join(rootDir, 'assets/company/logo.png'), 'utf8')).resolves.toBe('legacy');
    await expect(readFile(join(rootDir, 'storage/public/company/logo.png'), 'utf8')).resolves.toBe('target');
  });

  it('does not follow a symbolic-link directory already present in the destination', async () => {
    const externalDir = join(rootDir, 'outside-storage');
    await mkdir(join(rootDir, 'assets/company'), { recursive: true });
    await mkdir(externalDir, { recursive: true });
    await mkdir(join(rootDir, 'storage/public'), { recursive: true });
    await writeFile(join(rootDir, 'assets/company/logo.png'), 'legacy');
    await symlink(externalDir, join(rootDir, 'storage/public/company'), 'dir');

    const result = await migrateAssetsToStoragePublic({ rootDir });

    expect(result).toEqual({ copied: 0, skipped: 0, conflicts: ['company/logo.png'] });
    await expect(readFile(join(externalDir, 'logo.png'))).rejects.toMatchObject({ code: 'ENOENT' });
    await expect(readFile(join(rootDir, 'assets/company/logo.png'), 'utf8')).resolves.toBe('legacy');
  });

  it('preflights all destinations before copying and leaves no partial migration on conflict', async () => {
    await mkdir(join(rootDir, 'assets'), { recursive: true });
    await mkdir(join(rootDir, 'storage/public'), { recursive: true });
    await writeFile(join(rootDir, 'assets/a-first.png'), 'new asset');
    await writeFile(join(rootDir, 'assets/z-conflict.png'), 'legacy bytes');
    await writeFile(join(rootDir, 'storage/public/z-conflict.png'), 'different bytes');

    const result = await migrateAssetsToStoragePublic({ rootDir });

    expect(result).toEqual({ copied: 0, skipped: 0, conflicts: ['z-conflict.png'] });
    await expect(readFile(join(rootDir, 'storage/public/a-first.png'))).rejects.toMatchObject({ code: 'ENOENT' });
    await expect(readFile(join(rootDir, 'assets/z-conflict.png'), 'utf8')).resolves.toBe('legacy bytes');
    await expect(readFile(join(rootDir, 'storage/public/z-conflict.png'), 'utf8')).resolves.toBe('different bytes');
  });
});

