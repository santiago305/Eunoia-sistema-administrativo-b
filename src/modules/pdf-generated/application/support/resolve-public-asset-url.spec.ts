import { mkdir, rm, writeFile } from 'fs/promises';
import { join } from 'path';

jest.mock('src/infrastructure/config/envs', () => ({
  envs: {
    files: {
      publicDir: 'storage/public',
    },
  },
}));

import { resolvePublicAssetUrl } from './resolve-public-asset-url';

describe('resolvePublicAssetUrl', () => {
  const storageLogo = join(process.cwd(), 'storage/public/company/logo.png');
  const legacyLogo = join(process.cwd(), 'assets/company/logo.png');

  beforeEach(async () => {
    await rm(join(process.cwd(), 'storage/public/company'), {
      recursive: true,
      force: true,
    });
    await rm(join(process.cwd(), 'assets/company'), {
      recursive: true,
      force: true,
    });
  });

  afterEach(async () => {
    await rm(join(process.cwd(), 'storage/public/company'), {
      recursive: true,
      force: true,
    });
    await rm(join(process.cwd(), 'assets/company'), {
      recursive: true,
      force: true,
    });
  });

  it('resolves api asset URLs from storage public before legacy assets', async () => {
    await mkdir(join(process.cwd(), 'storage/public/company'), {
      recursive: true,
    });
    await mkdir(join(process.cwd(), 'assets/company'), { recursive: true });
    await writeFile(storageLogo, Buffer.from('storage-logo'));
    await writeFile(legacyLogo, Buffer.from('legacy-logo'));

    const result = await resolvePublicAssetUrl('/api/assets/company/logo.png');

    expect(result).toBe(`file:///${storageLogo.replace(/\\/g, '/')}`);
  });

  it('keeps external and data URLs unchanged', async () => {
    await expect(
      resolvePublicAssetUrl('https://cdn.example/logo.png'),
    ).resolves.toBe('https://cdn.example/logo.png');
    await expect(
      resolvePublicAssetUrl('data:image/png;base64,abc'),
    ).resolves.toBe('data:image/png;base64,abc');
  });
});
