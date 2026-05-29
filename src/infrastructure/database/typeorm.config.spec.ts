import { envs } from '../config/envs';
import { getTypeOrmModuleOptions } from './typeorm.config';

describe('getTypeOrmModuleOptions', () => {
  const previousNodeEnv = envs.nodeEnv;

  afterEach(() => {
    (envs as { nodeEnv: string }).nodeEnv = previousNodeEnv;
  });

  it('keeps synchronize enabled in development', () => {
    (envs as { nodeEnv: string }).nodeEnv = 'development';

    expect(getTypeOrmModuleOptions().synchronize).toBe(true);
  });

  it('disables synchronize outside development', () => {
    (envs as { nodeEnv: string }).nodeEnv = 'production';

    expect(getTypeOrmModuleOptions().synchronize).toBe(false);
  });
});
