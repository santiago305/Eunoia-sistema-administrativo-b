import { AuthController } from './auth.controller';
import { envs } from 'src/infrastructure/config/envs';
import { status } from 'src/shared/constantes/constants';
import { SKIP_CSRF_KEY } from 'src/shared/utilidades/decorators/skip-csrf.decorator';
import { THROTTLER_SKIP } from '@nestjs/throttler/dist/throttler.constants';

describe('AuthController security defaults', () => {
  const makeController = () => {
    const loginAuthUseCase = {
      execute: jest.fn().mockResolvedValue({
        access_token: 'access-token',
        refresh_token: 'refresh-token',
      }),
    };
    const refreshAuthUseCase = {
      execute: jest.fn().mockResolvedValue({
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
      }),
    };

    const controller = new AuthController(
      loginAuthUseCase as any,
      refreshAuthUseCase as any,
      { execute: jest.fn() } as any,
      { execute: jest.fn() } as any,
    );

    return { controller, loginAuthUseCase, refreshAuthUseCase };
  };

  const makeResponse = () => ({
    cookie: jest.fn(),
    clearCookie: jest.fn(),
  });

  it('uses req.ip instead of spoofable x-forwarded-for during login', async () => {
    const { controller, loginAuthUseCase } = makeController();
    const res = makeResponse();

    await controller.login(
      { email: 'ana@example.com', password: 'Password1234' },
      {
        headers: {
          'x-forwarded-for': '203.0.113.10',
          'user-agent': 'jest',
        },
        ip: '10.0.0.5',
      } as any,
      res as any,
    );

    expect(loginAuthUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        ip: '10.0.0.5',
      }),
    );
  });

  it('sets auth cookies as secure only in production', async () => {
    const { controller } = makeController();
    const previousNodeEnv = envs.nodeEnv;
    const previousCookieDomain = envs.cookieDomain;
    (envs as { nodeEnv: string }).nodeEnv = 'production';
    (envs as { cookieDomain: string | undefined }).cookieDomain = undefined;
    const res = makeResponse();

    try {
      await controller.login(
        { email: 'ana@example.com', password: 'Password1234' },
        { headers: {}, ip: '10.0.0.5' } as any,
        res as any,
      );
    } finally {
      (envs as { nodeEnv: string }).nodeEnv = previousNodeEnv;
      (envs as { cookieDomain: string | undefined }).cookieDomain = previousCookieDomain;
    }

    expect(res.cookie).toHaveBeenCalledWith(
      'access_token',
      'access-token',
      expect.objectContaining({ secure: true }),
    );
    expect(res.cookie).toHaveBeenCalledWith(
      'refresh_token',
      'refresh-token',
      expect.objectContaining({ secure: true }),
    );
  });

  it('keeps auth cookies non-secure in development for local HTTP', async () => {
    const { controller } = makeController();
    const previousNodeEnv = envs.nodeEnv;
    (envs as { nodeEnv: string }).nodeEnv = 'development';
    const res = makeResponse();

    try {
      await controller.login(
        { email: 'ana@example.com', password: 'Password1234' },
        { headers: {}, ip: '10.0.0.5' } as any,
        res as any,
      );
    } finally {
      (envs as { nodeEnv: string }).nodeEnv = previousNodeEnv;
    }

    expect(res.cookie).toHaveBeenCalledWith(
      'access_token',
      'access-token',
      expect.objectContaining({ secure: false }),
    );
  });

  it('applies cookie domain only to csrf cookie when configured', async () => {
    const { controller } = makeController();
    const previousNodeEnv = envs.nodeEnv;
    const previousCookieDomain = envs.cookieDomain;
    (envs as { nodeEnv: string }).nodeEnv = 'production';
    (envs as { cookieDomain: string | undefined }).cookieDomain = 'eunoiacosmetica.com';
    const res = makeResponse();

    try {
      await controller.login(
        { email: 'ana@example.com', password: 'Password1234' },
        { headers: {}, ip: '10.0.0.5' } as any,
        res as any,
      );
    } finally {
      (envs as { nodeEnv: string }).nodeEnv = previousNodeEnv;
      (envs as { cookieDomain: string | undefined }).cookieDomain = previousCookieDomain;
    }

    expect(res.cookie).toHaveBeenCalledWith(
      'csrf_token',
      expect.any(String),
      expect.objectContaining({ domain: 'eunoiacosmetica.com' }),
    );
    expect(res.cookie).toHaveBeenCalledWith(
      'access_token',
      'access-token',
      expect.not.objectContaining({ domain: expect.any(String) }),
    );
    expect(res.cookie).toHaveBeenCalledWith(
      'refresh_token',
      'refresh-token',
      expect.not.objectContaining({ domain: expect.any(String) }),
    );
  });

  it('clears auth cookies when refresh token is invalid', async () => {
    const { controller, refreshAuthUseCase } = makeController();
    const res = makeResponse();
    refreshAuthUseCase.execute.mockResolvedValueOnce({
      type: status.UNAUTHORIZED,
      message: 'Sesion invalida o expirada',
    });

    const result = await controller.refresh(
      { sub: 'user-1', sessionId: 'session-1' },
      { cookies: { refresh_token: 'stale-refresh-token' } } as any,
      res as any,
    );

    expect(result).toEqual({
      type: status.UNAUTHORIZED,
      message: 'Sesion invalida o expirada',
    });
    expect(res.clearCookie).toHaveBeenCalledWith(
      'refresh_token',
      expect.objectContaining({ httpOnly: true, path: '/' }),
    );
    expect(res.clearCookie).toHaveBeenCalledWith(
      'access_token',
      expect.objectContaining({ httpOnly: true, path: '/' }),
    );
    expect(res.clearCookie).toHaveBeenCalledWith(
      'csrf_token',
      expect.objectContaining({ httpOnly: false, path: '/' }),
    );
  });

  it('allows login and refresh to run with stale cookies that no longer have csrf', () => {
    expect(Reflect.getMetadata(SKIP_CSRF_KEY, AuthController.prototype.login)).toBe(true);
    expect(Reflect.getMetadata(SKIP_CSRF_KEY, AuthController.prototype.refresh)).toBe(true);
  });

  it('does not throttle passive session probes', () => {
    expect(Reflect.getMetadata(`${THROTTLER_SKIP}default`, AuthController.prototype.getAuthUser)).toBe(true);
  });
});
