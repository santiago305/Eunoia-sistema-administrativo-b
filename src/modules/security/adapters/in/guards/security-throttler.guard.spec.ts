import { ExecutionContext, HttpException } from '@nestjs/common';
import { SecurityThrottlerGuard } from './security-throttler.guard';

describe('SecurityThrottlerGuard', () => {
  it('blocks the 121st request for one session and keeps a different API route available', async () => {
    const hits = new Map<string, number>();
    const storage = {
      increment: jest.fn(async (key: string, ttl: number, limit: number) => {
        const totalHits = (hits.get(key) ?? 0) + 1;
        hits.set(key, totalHits);
        return {
          totalHits,
          timeToExpire: Math.ceil(ttl / 1000),
          isBlocked: totalHits > limit,
          timeToBlockExpire: totalHits > limit ? 60 : 0,
        };
      }),
    };
    const trackerResolver = {
      executePrimary: jest.fn().mockResolvedValue({
        tracker: 'session:session-1:user:user-1',
        trackerType: 'session',
        userId: 'user-1',
        sessionId: 'session-1',
      }),
      executeIp: jest.fn().mockReturnValue({
        tracker: '203.0.113.30',
        trackerType: 'ip',
        userId: null,
        sessionId: null,
      }),
      describeTracker: jest.fn().mockReturnValue({
        tracker: 'session:session-1:user:user-1',
        trackerType: 'session',
        userId: 'user-1',
        sessionId: 'session-1',
      }),
    };
    const redisStorage = {
      buildTrackerKeySuffix: jest.fn((tracker: string) =>
        tracker === '203.0.113.30' ? 'b'.repeat(64) : 'a'.repeat(64),
      ),
      claimFirstBlockEvent: jest.fn().mockResolvedValue(true),
    };
    const registerViolation = {
      execute: jest.fn().mockResolvedValue({
        banLevel: 0,
        bannedUntil: null,
        manualPermanentBan: false,
      }),
    };
    const guard = new SecurityThrottlerGuard(
      [
        { ttl: 60_000, limit: 120 },
        { name: 'ip-safety', ttl: 60_000, limit: 600 },
      ],
      storage as any,
      { getAllAndOverride: jest.fn().mockReturnValue(undefined) } as any,
      { execute: jest.fn().mockReturnValue('203.0.113.30') } as any,
      registerViolation as any,
      redisStorage as any,
      trackerResolver as any,
    );
    await guard.onModuleInit();

    const buildContext = (handler: () => void) => {
      const request = {
        path: `/api/${handler.name}`,
        method: 'GET',
        headers: { 'x-request-id': 'single-session-simulation' },
      };
      return {
        getClass: () => class InventoryController {},
        getHandler: () => handler,
        switchToHttp: () => ({
          getRequest: () => request,
          getResponse: () => ({ header: jest.fn(), setHeader: jest.fn() }),
        }),
      } as unknown as ExecutionContext;
    };
    const inventoryContext = buildContext(function listInventoryRows() {});

    for (let attempt = 1; attempt <= 120; attempt += 1) {
      await expect(guard.canActivate(inventoryContext)).resolves.toBe(true);
    }
    await expect(guard.canActivate(inventoryContext)).rejects.toMatchObject({
      status: 429,
    });

    const movementsContext = buildContext(
      function listInventoryLedgerMovements() {},
    );
    await expect(guard.canActivate(movementsContext)).resolves.toBe(true);
    expect(registerViolation.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        reason: 'operator_rate_limit_exceeded',
        trackerType: 'session',
      }),
    );
  });

  it('applies the primary session tracker and the secondary IP tracker', async () => {
    const storage = {
      increment: jest.fn().mockResolvedValue({
        totalHits: 1,
        timeToExpire: 60,
        isBlocked: false,
        timeToBlockExpire: 0,
      }),
    };
    const redisStorage = {
      buildTrackerKeySuffix: jest.fn((tracker: string) => `hash-${tracker}`),
    };
    const trackerResolver = {
      executePrimary: jest.fn().mockResolvedValue({
        tracker: 'session:session-1:user:user-1',
        trackerType: 'session',
        userId: 'user-1',
        sessionId: 'session-1',
      }),
      executeIp: jest.fn().mockReturnValue({
        tracker: '203.0.113.30',
        trackerType: 'ip',
        userId: null,
        sessionId: null,
      }),
    };
    const guard = new SecurityThrottlerGuard(
      [
        { ttl: 60_000, limit: 120 },
        { name: 'ip-safety', ttl: 60_000, limit: 600 },
      ],
      storage as any,
      { getAllAndOverride: jest.fn().mockReturnValue(undefined) } as any,
      { execute: jest.fn().mockReturnValue('203.0.113.30') } as any,
      { execute: jest.fn() } as any,
      redisStorage as any,
      trackerResolver as any,
    );
    await guard.onModuleInit();
    const request = { headers: {} };
    const context = {
      getClass: () => class InventoryController {},
      getHandler: () => function listInventoryDocuments() {},
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => ({ header: jest.fn() }),
      }),
    } as unknown as ExecutionContext;

    await expect(guard.canActivate(context)).resolves.toBe(true);

    expect(trackerResolver.executePrimary).toHaveBeenCalledWith(request);
    expect(trackerResolver.executeIp).toHaveBeenCalledWith(request);
    expect(redisStorage.buildTrackerKeySuffix.mock.calls).toEqual([
      ['session:session-1:user:user-1'],
      ['203.0.113.30'],
    ]);
    expect(storage.increment).toHaveBeenNthCalledWith(
      1,
      expect.any(String),
      60_000,
      120,
      60_000,
      'default',
    );
    expect(storage.increment).toHaveBeenNthCalledWith(
      2,
      expect.any(String),
      60_000,
      600,
      60_000,
      'ip-safety',
    );
  });

  it.each([
    [true, 'rate_limit_exceeded'],
    [false, 'rate_limit_blocked_request'],
  ])(
    'records whether the Redis block is new (%s)',
    async (isFirstBlock, expectedReason) => {
      const request = {
        path: '/inventory-documents',
        method: 'GET',
        headers: {
          'user-agent': 'test-agent',
          'x-request-id': 'request-123',
        },
      };
      const response = { setHeader: jest.fn() };
      const context = {
        getClass: () => class InventoryController {},
        getHandler: () => function listInventoryDocuments() {},
        switchToHttp: () => ({
          getRequest: () => request,
          getResponse: () => response,
        }),
      } as unknown as ExecutionContext;
      const redisThrottlerStorage = {
        buildTrackerKeySuffix: jest.fn().mockReturnValue('tracker-hash'),
        claimFirstBlockEvent: jest.fn().mockResolvedValue(isFirstBlock),
      };
      const registerViolation = {
        execute: jest.fn().mockResolvedValue({
          banLevel: 0,
          bannedUntil: null,
          manualPermanentBan: false,
        }),
      };
      const rateLimitTracker = {
        executePrimary: jest.fn(),
        executeIp: jest.fn(),
        describeTracker: jest.fn().mockReturnValue({
          tracker: '203.0.113.30',
          trackerType: 'ip',
          userId: null,
          sessionId: null,
        }),
      };
      const guard = new SecurityThrottlerGuard(
        [{ ttl: 60_000, limit: 120 }],
        {} as any,
        {} as any,
        { execute: jest.fn().mockReturnValue('203.0.113.30') } as any,
        registerViolation as any,
        redisThrottlerStorage as any,
        rateLimitTracker as any,
      );
      await guard.onModuleInit();

      let thrown: unknown;
      try {
        await (guard as any).throwThrottlingException(context, {
          limit: 120,
          ttl: 60_000,
          key: 'route-key:tracker-hash',
          tracker: '203.0.113.30',
          totalHits: 121,
          timeToExpire: 55,
          isBlocked: true,
          timeToBlockExpire: 55,
        });
      } catch (error) {
        thrown = error;
      }

      expect(thrown).toBeInstanceOf(HttpException);
      expect((thrown as HttpException).getStatus()).toBe(429);
      expect(registerViolation.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          reason: expectedReason,
          requestId: 'request-123',
          totalHits: 121,
          requestLimit: 120,
          windowSeconds: 60,
        }),
      );
    },
  );

  it('audits a session limit without increasing IP recurrence', async () => {
    const request = {
      path: '/inventory-documents',
      method: 'GET',
      headers: { 'x-request-id': 'request-session' },
    };
    const context = {
      getClass: () => class InventoryController {},
      getHandler: () => function listInventoryDocuments() {},
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => ({ setHeader: jest.fn() }),
      }),
    } as unknown as ExecutionContext;
    const registerViolation = {
      execute: jest.fn().mockResolvedValue({
        banLevel: 0,
        bannedUntil: null,
        manualPermanentBan: false,
      }),
    };
    const guard = new SecurityThrottlerGuard(
      [{ ttl: 60_000, limit: 120 }],
      {} as any,
      {} as any,
      { execute: jest.fn().mockReturnValue('203.0.113.30') } as any,
      registerViolation as any,
      {
        buildTrackerKeySuffix: jest.fn(),
        claimFirstBlockEvent: jest.fn().mockResolvedValue(true),
      } as any,
      {
        describeTracker: jest.fn().mockReturnValue({
          tracker: 'session:session-1:user:user-1',
          trackerType: 'session',
          userId: 'user-1',
          sessionId: 'session-1',
        }),
      } as any,
    );
    await guard.onModuleInit();

    await expect(
      (guard as any).throwThrottlingException(context, {
        limit: 120,
        ttl: 60_000,
        key: 'route-key:tracker-hash',
        tracker: 'session:session-1:user:user-1',
        totalHits: 121,
        timeToExpire: 55,
        isBlocked: true,
        timeToBlockExpire: 55,
      }),
    ).rejects.toBeInstanceOf(HttpException);

    expect(registerViolation.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        reason: 'operator_rate_limit_exceeded',
        trackerType: 'session',
        userId: 'user-1',
        sessionId: 'session-1',
      }),
    );
  });
});
