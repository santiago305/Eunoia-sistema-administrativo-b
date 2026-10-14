import { createReadStream } from 'fs';
import { createHash } from 'crypto';
import { copyFile, lstat, mkdir, readdir } from 'fs/promises';
import { dirname, join, relative, sep } from 'path';

export type MigrateAssetsToStoragePublicInput = {
  rootDir?: string;
  legacyAssetsDir?: string;
  storagePublicDir?: string;
};

export type MigrateAssetsToStoragePublicResult = {
  copied: number;
  skipped: number;
  conflicts: string[];
};

const listFiles = async (directory: string): Promise<string[]> => {
  let entries: Array<{
    name: string;
    isDirectory: () => boolean;
    isFile: () => boolean;
  }>;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error: any) {
    if (error?.code === 'ENOENT') return [];
    throw error;
  }

  const files = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = join(directory, entry.name);
      if (entry.isDirectory()) return listFiles(entryPath);
      return entry.isFile() ? [entryPath] : [];
    }),
  );
  return files.flat();
};

const hashFile = async (path: string) => {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(path)) {
    hash.update(chunk as Buffer);
  }
  return hash.digest('hex');
};

const compareExistingFile = async (source: string, target: string) => {
  try {
    const targetStat = await lstat(target);
    if (!targetStat.isFile() || targetStat.isSymbolicLink()) {
      return { exists: true, sameContent: false };
    }
    const sourceHash = await hashFile(source);
    const targetHash = await hashFile(target);
    return { exists: true, sameContent: sourceHash === targetHash };
  } catch (error: any) {
    if (error?.code === 'ENOENT') return { exists: false, sameContent: false };
    throw error;
  }
};

const hasSafeTargetDirectories = async (publicRoot: string, target: string) => {
  const relativeDirectory = relative(publicRoot, dirname(target));
  const directories = [publicRoot];
  if (relativeDirectory && relativeDirectory !== '.') {
    let current = publicRoot;
    for (const segment of relativeDirectory.split(sep)) {
      current = join(current, segment);
      directories.push(current);
    }
  }

  for (const directory of directories) {
    try {
      const entry = await lstat(directory);
      if (entry.isSymbolicLink() || !entry.isDirectory()) return false;
    } catch (error: any) {
      if (error?.code !== 'ENOENT') throw error;
      // Missing directories are safe; mkdir will create them below the checked root.
      break;
    }
  }
  return true;
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
  const conflicts: string[] = [];
  const pendingCopies: Array<{ source: string; target: string }> = [];

  for (const source of files) {
    const relativePath = relative(legacyRoot, source);
    const target = join(publicRoot, relativePath);
    if (!(await hasSafeTargetDirectories(publicRoot, target))) {
      conflicts.push(relativePath.replace(/\\/g, '/'));
      continue;
    }
    const comparison = await compareExistingFile(source, target);
    if (comparison.exists) {
      if (comparison.sameContent) skipped += 1;
      else conflicts.push(relativePath.replace(/\\/g, '/'));
      continue;
    }

    pendingCopies.push({ source, target });
  }

  // Do not leave a partial migration behind when any destination needs review.
  if (conflicts.length) return { copied: 0, skipped, conflicts };

  for (const { source, target } of pendingCopies) {
    await mkdir(dirname(target), { recursive: true });
    await copyFile(source, target);
    copied += 1;
  }

  return { copied, skipped, conflicts };
};
