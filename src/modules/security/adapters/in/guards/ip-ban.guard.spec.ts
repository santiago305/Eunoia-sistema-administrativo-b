import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { IpBanGuard } from './ip-ban.guard';

describe('IpBanGuard', () => {
  const request = {
    path: '/inventory/stream',
    method: 'GET',
    headers: { 'user-agent': 'test-agent' },
  };
  const context = {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => ({ setHeader: jest.fn() }),
    }),
  } as unknown as ExecutionContext;

  it('audits a request blocked by a temporary ban without applying the policy again', async () => {
    const resolveClientIpUseCase = {
      execute: jest.fn().mockReturnValue('203.0.113.10'),
    };
    const checkIpBanUseCase = {
      execute: jest.fn().mockResolvedValue({
        blocked: true,
        ban: { manualPermanentBan: false, banLevel: 4 },
      }),
    };
    const recordIpViolationUseCase = {
      execute: jest.fn().mockResolvedValue(undefined),
    };
    const guard = new IpBanGuard(
      resolveClientIpUseCase as any,
      checkIpBanUseCase as any,
      recordIpViolationUseCase as any,
    );

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(recordIpViolationUseCase.execute).toHaveBeenCalledWith(expect.objectContaining({
      ip: '203.0.113.10',
      reason: 'temporary_ban_request',
      path: '/inventory/stream',
      method: 'GET',
      userAgent: 'test-agent',
      countedForBan: false,
      banLevelAfter: 4,
    }));
    expect(checkIpBanUseCase.execute).toHaveBeenCalledTimes(1);
  });

  it('audits a request blocked by a permanent ban with its specific reason', async () => {
    const resolveClientIpUseCase = {
      execute: jest.fn().mockReturnValue('203.0.113.11'),
    };
    const checkIpBanUseCase = {
      execute: jest.fn().mockResolvedValue({
        blocked: true,
        ban: { manualPermanentBan: true, banLevel: 4 },
      }),
    };
    const recordIpViolationUseCase = {
      execute: jest.fn().mockResolvedValue(undefined),
    };
    const guard = new IpBanGuard(
      resolveClientIpUseCase as any,
      checkIpBanUseCase as any,
      recordIpViolationUseCase as any,
    );

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(recordIpViolationUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        ip: '203.0.113.11',
        reason: 'manual_permanent_ban_request',
      }),
    );
  });

  it('allows requests when there is no active ban', async () => {
    const resolveClientIpUseCase = {
      execute: jest.fn().mockReturnValue('203.0.113.12'),
    };
    const checkIpBanUseCase = {
      execute: jest.fn().mockResolvedValue({ blocked: false, ban: null }),
    };
    const recordIpViolationUseCase = { execute: jest.fn() };
    const guard = new IpBanGuard(
      resolveClientIpUseCase as any,
      checkIpBanUseCase as any,
      recordIpViolationUseCase as any,
    );

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(recordIpViolationUseCase.execute).not.toHaveBeenCalled();
  });
});
