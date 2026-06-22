import { envs } from '../config/envs';
import { readdirSync } from 'fs';
import { join } from 'path';
import {
  getMigrationDataSourceOptions,
  getTypeOrmModuleOptions,
} from './typeorm.config';

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

  it('registers every migration file in the migration datasource', () => {
    const migrationsDir = join(__dirname, 'migrations');
    const expectedMigrationNames = readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.ts') && !file.endsWith('.spec.ts'))
      .flatMap((file) => {
        const migrationModule = require(join(migrationsDir, file));
        return Object.values(migrationModule)
          .filter(
            (value): value is Function =>
              typeof value === 'function' &&
              typeof value.prototype?.up === 'function',
          )
          .map((migration) => migration.name);
      });

    const registeredMigrations = (getMigrationDataSourceOptions().migrations ??
      []) as Array<string | Function>;
    const registeredMigrationNames = registeredMigrations.map((migration) =>
      typeof migration === 'function' ? migration.name : String(migration),
    );

    expect(registeredMigrationNames).toEqual(
      expect.arrayContaining(expectedMigrationNames),
    );
  });
});
