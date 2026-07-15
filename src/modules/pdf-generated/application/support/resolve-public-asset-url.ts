import { access } from 'fs/promises';
import { join } from 'path';
import { pathToFileURL } from 'url';
import sharp from 'sharp';
import { envs } from 'src/infrastructure/config/envs';

const isDirectUrl = (value: string) => /^(https?:|data:|file:)/i.test(value);

const toPublicRelativePath = (assetPath: string) => {
  const normalized = assetPath.replace(/\\/g, '/');
  if (normalized.startsWith('/api/assets/')) {
    return normalized.replace(/^\/api\/assets\//, '');
  }
  if (normalized.startsWith('/assets/')) {
    return normalized.replace(/^\/assets\//, '');
  }
  if (normalized.startsWith('public/')) {
    return normalized.replace(/^public\//, '');
  }
  return normalized.replace(/^\/+/, '');
};

const exists = async (pathValue: string) => {
  try {
    await access(pathValue);
    return true;
  } catch {
    return false;
  }
};

const resolvePublicAssetPath = async (assetPath: string) => {
  const relative = toPublicRelativePath(assetPath);
  const storagePublicPath = join(process.cwd(), envs.files.publicDir, relative);
  if (await exists(storagePublicPath)) {
    return storagePublicPath;
  }
  return join(process.cwd(), 'assets', relative);
};

export const resolvePublicAssetUrl = async (assetPath?: string) => {
  if (!assetPath) return undefined;
  if (isDirectUrl(assetPath)) return assetPath;

  const absolutePath = await resolvePublicAssetPath(assetPath);
  if (/\.webp$/i.test(absolutePath)) {
    try {
      const pngBuffer = await sharp(absolutePath).png().toBuffer();
      return `data:image/png;base64,${pngBuffer.toString('base64')}`;
    } catch {
      return pathToFileURL(absolutePath).toString();
    }
  }

  return pathToFileURL(absolutePath).toString();
};

