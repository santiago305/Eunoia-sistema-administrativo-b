const REQUIRED_ENV = {
  PORT: '3000',
  NODE_ENV: 'development',
  TRUST_PROXY: 'false',
  DB_HOST: 'localhost',
  DB_PORT: '5432',
  DB_USERNAME: 'postgres',
  DB_PASSWORD: 'postgres',
  DB_NAME: 'eunoia_test',
  JWT_EXPIRES_IN: '1h',
  JWT_ISSUER: 'eunoia-test',
  JWT_REFRESH_EXPIRES_IN: '7d',
  REDIS_HOST: 'localhost',
  REDIS_PORT: '6379',
};

describe('envs validation', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    jest.doMock('dotenv/config', () => ({}));
    process.env = { ...originalEnv, ...REQUIRED_ENV };
  });

  afterEach(() => {
    jest.dontMock('dotenv/config');
    process.env = originalEnv;
  });

  it('rejects short JWT and cookie secrets', () => {
    process.env.JWT_SECRET = 'short';
    process.env.COOKIE_SECRET = 'short';

    expect(() => {
      jest.isolateModules(() => {
        require('./envs');
      });
    }).toThrow(/JWT_SECRET|COOKIE_SECRET/);
  });

  it('accepts JWT and cookie secrets with at least 32 characters', () => {
    process.env.JWT_SECRET = 'j'.repeat(32);
    process.env.COOKIE_SECRET = 'c'.repeat(32);

    expect(() => {
      jest.isolateModules(() => {
        require('./envs');
      });
    }).not.toThrow();
  });

  it('rejects missing production secrets', () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'Jwt_Production_2026!'.repeat(2);
    process.env.COOKIE_SECRET = 'Cookie_Production_2026!'.repeat(2);
    delete process.env.DB_PASSWORD;
    delete process.env.REDIS_PASSWORD;
    delete process.env.MASTER_ADMIN_INITIAL_PASSWORD;

    expect(() => {
      jest.isolateModules(() => {
        require('./envs');
      });
    }).toThrow(/DB_PASSWORD|REDIS_PASSWORD|MASTER_ADMIN_INITIAL_PASSWORD/);
  });

  it('rejects local fallbacks and placeholders in production', () => {
    process.env.NODE_ENV = 'production';
    process.env.DB_PASSWORD = 'eunoia-local-postgres';
    process.env.REDIS_PASSWORD = 'eunoia-local-redis';
    process.env.JWT_SECRET = 'local-jwt-secret-change-before-production-123456';
    process.env.COOKIE_SECRET =
      'local-cookie-secret-change-before-production-1234';
    process.env.MASTER_ADMIN_INITIAL_PASSWORD = 'DevMaster_ChangeMe123!';

    expect(() => {
      jest.isolateModules(() => {
        require('./envs');
      });
    }).toThrow(/secretos de producción ausentes, débiles o de ejemplo/);
  });

  it('accepts strong production secrets', () => {
    process.env.NODE_ENV = 'production';
    process.env.DB_PASSWORD = 'Db_9fH2!mQ7#vL4@xP8';
    process.env.REDIS_PASSWORD = 'Redis_6!zN3@qW8#kT2';
    process.env.JWT_SECRET = 'Jwt_Production_9fH2!mQ7#vL4@xP8$zN3';
    process.env.COOKIE_SECRET = 'Cookie_Production_6zN3@qW8#kT2!mQ7';
    process.env.MASTER_ADMIN_INITIAL_PASSWORD = 'Root_8#xP2!vL6';

    expect(() => {
      jest.isolateModules(() => {
        require('./envs');
      });
    }).not.toThrow();
  });

  it('uses unified storage defaults for files and mail attachments', () => {
    process.env.JWT_SECRET = 'j'.repeat(32);
    process.env.COOKIE_SECRET = 'c'.repeat(32);

    jest.isolateModules(() => {
      const { envs } = require('./envs');

      expect(envs.files.rootDir).toBe('storage');
      expect(envs.files.publicDir).toBe('storage/public');
      expect(envs.files.privateDir).toBe('storage/private');
      expect(envs.files.deletedDir).toBe('storage/deleted');
      expect(envs.mail.attachmentsDir).toBe(
        'storage/private/mail-attachments',
      );
      expect(envs.mail.attachmentsDeletedDir).toBe(
        'storage/deleted/mail-attachments',
      );
    });
  });

  it('uses localhost CORS origins by default', () => {
    process.env.JWT_SECRET = 'j'.repeat(32);
    process.env.COOKIE_SECRET = 'c'.repeat(32);
    delete process.env.CORS_ORIGINS;

    jest.isolateModules(() => {
      const { envs } = require('./envs');

      expect(envs.corsOrigins).toEqual([
        'http://localhost:5173',
        'http://127.0.0.1:5173',
      ]);
    });
  });

  it('parses CORS origins from a comma-separated env value', () => {
    process.env.JWT_SECRET = 'j'.repeat(32);
    process.env.COOKIE_SECRET = 'c'.repeat(32);
    process.env.CORS_ORIGINS = 'https://app.eunoia.pe, https://admin.eunoia.pe';

    jest.isolateModules(() => {
      const { envs } = require('./envs');

      expect(envs.corsOrigins).toEqual([
        'https://app.eunoia.pe',
        'https://admin.eunoia.pe',
      ]);
    });
  });
});
