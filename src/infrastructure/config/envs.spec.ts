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
    process.env = { ...originalEnv, ...REQUIRED_ENV };
  });

  afterEach(() => {
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
});
