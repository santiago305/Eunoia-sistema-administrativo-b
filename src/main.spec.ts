import { join } from 'path';

const appMock = {
  useStaticAssets: jest.fn(),
  setGlobalPrefix: jest.fn(),
  useGlobalPipes: jest.fn(),
  useGlobalFilters: jest.fn(),
  enableCors: jest.fn(),
  use: jest.fn(),
  useGlobalInterceptors: jest.fn(),
  listen: jest.fn().mockResolvedValue(undefined),
  set: jest.fn(),
};

jest.mock('@nestjs/core', () => ({
  NestFactory: {
    create: jest.fn().mockResolvedValue(appMock),
  },
}));

jest.mock('./app.module', () => ({
  AppModule: class AppModule {},
}));

jest.mock('./infrastructure/database/run-migrations', () => ({
  runMigrations: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('./infrastructure/config/envs', () => ({
  envs: {
    files: {
      publicDir: 'storage/public',
    },
    port: 3000,
    trustProxy: false,
    corsOrigins: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  },
}));

jest.mock('./shared/errores/http-exception.filter', () => ({
  HttpErrorFilter: class HttpErrorFilter {},
}));

jest.mock('./shared/utilidades/interceptors/logging.interceptor', () => ({
  LoggingInterceptor: class LoggingInterceptor {},
}));

jest.mock('./shared/utilidades/middleware/enable-cookie-parser', () => ({
  enableCookieParser: jest.fn(),
}));

jest.mock('helmet', () => jest.fn(() => 'helmet-middleware'));
jest.mock('compression', () => jest.fn(() => 'compression-middleware'));

describe('bootstrap static assets', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  it('serves unified public storage before legacy assets under /api/assets', async () => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);

    await import('./main');
    await new Promise(process.nextTick);

    expect(appMock.useStaticAssets).toHaveBeenNthCalledWith(
      1,
      join(process.cwd(), 'storage/public'),
      { prefix: '/api/assets/' },
    );
    expect(appMock.useStaticAssets).toHaveBeenNthCalledWith(
      2,
      join(process.cwd(), 'assets'),
      { prefix: '/api/assets/' },
    );
  });

  it('enables CORS using configured origins', async () => {
    await import('./main');
    await new Promise(process.nextTick);

    expect(appMock.enableCors).toHaveBeenCalledWith(
      expect.objectContaining({
        origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
        credentials: true,
      }),
    );
  });
});
