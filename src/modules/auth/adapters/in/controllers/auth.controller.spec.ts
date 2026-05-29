import { AuthController } from './auth.controller';
import { envs } from 'src/infrastructure/config/envs';

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
    (envs as { nodeEnv: string }).nodeEnv = 'production';
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
});
