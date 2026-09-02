import { ResolveRateLimitTrackerUseCase } from './resolve-rate-limit-tracker.usecase';

describe('ResolveRateLimitTrackerUseCase', () => {
  const ipResolver = {
    execute: jest.fn().mockReturnValue('203.0.113.40'),
  };

  it('uses a verified user and session as the primary tracker', async () => {
    const jwtService = {
      verifyAsync: jest.fn().mockResolvedValue({
        sub: 'user-1',
        sessionId: 'session-1',
      }),
    };
    const useCase = new ResolveRateLimitTrackerUseCase(
      jwtService as any,
      ipResolver as any,
    );

    const result = await useCase.executePrimary({
      signedCookies: { access_token: 'signed-token' },
      cookies: {},
      headers: {},
    } as any);

    expect(result).toEqual({
      tracker: 'session:session-1:user:user-1',
      trackerType: 'session',
      userId: 'user-1',
      sessionId: 'session-1',
    });
    expect(jwtService.verifyAsync).toHaveBeenCalledWith(
      'signed-token',
      expect.objectContaining({ secret: expect.any(String) }),
    );
  });

  it('falls back to IP when the access token is invalid', async () => {
    const useCase = new ResolveRateLimitTrackerUseCase(
      { verifyAsync: jest.fn().mockRejectedValue(new Error('invalid')) } as any,
      ipResolver as any,
    );

    const result = await useCase.executePrimary({
      cookies: { access_token: 'invalid-token' },
      headers: {},
    } as any);

    expect(result).toEqual({
      tracker: '203.0.113.40',
      trackerType: 'ip',
      userId: null,
      sessionId: null,
    });
  });

  it('isolates login attempts by IP and account without storing the email', async () => {
    const useCase = new ResolveRateLimitTrackerUseCase(
      { verifyAsync: jest.fn() } as any,
      ipResolver as any,
    );

    const first = await useCase.executePrimary({
      path: '/api/auth/login',
      body: { email: ' Operador@Empresa.com ' },
      cookies: {},
      headers: {},
    } as any);
    const second = await useCase.executePrimary({
      path: '/api/auth/login',
      body: { email: 'otro@empresa.com' },
      cookies: {},
      headers: {},
    } as any);

    expect(first.trackerType).toBe('login');
    expect(first.tracker).toMatch(
      /^login:account:[a-f0-9]{64}:ip:[a-f0-9]{64}$/,
    );
    expect(first.tracker).not.toContain('operador@empresa.com');
    expect(second.tracker).not.toBe(first.tracker);
  });

  it('uses the signed refresh token to retain the session tracker', async () => {
    const jwtService = {
      verifyAsync: jest.fn().mockResolvedValue({
        sub: 'user-1',
        sessionId: 'session-refresh',
      }),
    };
    const useCase = new ResolveRateLimitTrackerUseCase(
      jwtService as any,
      ipResolver as any,
    );

    const result = await useCase.executePrimary({
      path: '/api/auth/refresh',
      signedCookies: { refresh_token: 'signed-refresh-token' },
      cookies: {},
      headers: {},
    } as any);

    expect(result.trackerType).toBe('session');
    expect(result.sessionId).toBe('session-refresh');
    expect(jwtService.verifyAsync).toHaveBeenCalledWith(
      'signed-refresh-token',
      expect.any(Object),
    );
  });

  it('always uses IP for the secondary protection', () => {
    const useCase = new ResolveRateLimitTrackerUseCase(
      { verifyAsync: jest.fn() } as any,
      ipResolver as any,
    );

    expect(useCase.executeIp({} as any).trackerType).toBe('ip');
  });
});
