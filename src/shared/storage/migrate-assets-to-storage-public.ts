import { copyFile, mkdir, readdir, stat } from 'fs/promises';
import { dirname, join, relative } from 'path';

export type MigrateAssetsToStoragePublicInput = {
  rootDir?: string;
  legacyAssetsDir?: string;
  storagePublicDir?: string;
};

export type MigrateAssetsToStoragePublicResult = {
  copied: number;
  skipped: number;
};

const listFiles = async (directory: string): Promise<string[]> => {
  let entries: Array<{ name: string; isDirectory: () => boolean }>;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error: any) {
    if (error?.code === 'ENOENT') return [];
    throw error;
  }

  const files = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = join(directory, entry.name);
      return entry.isDirectory() ? listFiles(entryPath) : [entryPath];
    }),
  );
  return files.flat();
};

const hasSameSize = async (source: string, target: string) => {
  try {
    const [sourceStat, targetStat] = await Promise.all([
      stat(source),
      stat(target),
    ]);
    return sourceStat.size === targetStat.size;
  } catch (error: any) {
    if (error?.code === 'ENOENT') return false;
    throw error;
  }
};

export const migrateAssetsToStoragePublic = async (
  input: MigrateAssetsToStoragePublicInput = {},
): Promise<MigrateAssetsToStoragePublicResult> => {
  const rootDir = input.rootDir ?? process.cwd();
  const legacyRoot = join(rootDir, input.legacyAssetsDir ?? 'assets');
  const publicRoot = join(rootDir, input.storagePublicDir ?? 'storage/public');
  const files = await listFiles(legacyRoot);
  let copied = 0;
  let skipped = 0;

  for (const source of files) {
    const target = join(publicRoot, relative(legacyRoot, source));
    if (await hasSameSize(source, target)) {
      skipped += 1;
      continue;
    }

    await mkdir(dirname(target), { recursive: true });
    await copyFile(source, target);
    copied += 1;
  }

  return { copied, skipped };
};
