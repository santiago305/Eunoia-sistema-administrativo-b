import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'fs/promises';
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
    expect(result).toEqual({ copied: 1, skipped: 0 });
  });

  it('skips files that already exist with the same size', async () => {
    await mkdir(join(rootDir, 'assets/company'), { recursive: true });
    await mkdir(join(rootDir, 'storage/public/company'), { recursive: true });
    await writeFile(join(rootDir, 'assets/company/logo.png'), 'same');
    await writeFile(join(rootDir, 'storage/public/company/logo.png'), 'same');
    const before = await stat(join(rootDir, 'storage/public/company/logo.png'));

    const result = await migrateAssetsToStoragePublic({ rootDir });
    const after = await stat(join(rootDir, 'storage/public/company/logo.png'));

    expect(result).toEqual({ copied: 0, skipped: 1 });
    expect(after.mtimeMs).toBe(before.mtimeMs);
  });
});

