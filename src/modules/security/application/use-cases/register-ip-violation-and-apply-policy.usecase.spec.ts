import { RegisterIpViolationAndApplyPolicyUseCase } from './register-ip-violation-and-apply-policy.usecase';

describe('RegisterIpViolationAndApplyPolicyUseCase', () => {
  const makeUseCase = (violationsInWindow: number) => {
    const violationRepository = {
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => value),
      count: jest.fn().mockResolvedValue(violationsInWindow),
    };
    const banRepository = {
      create: jest.fn((value) => value),
      findOne: jest.fn().mockResolvedValue(null),
      save: jest.fn(async (value) => value),
    };
    const resolveClientIpUseCase = {
      normalizeIp: jest.fn((ip: string) => ip),
    };

    const useCase = new RegisterIpViolationAndApplyPolicyUseCase(
      violationRepository as any,
      banRepository as any,
      resolveClientIpUseCase as any,
    );

    return { useCase, banRepository, violationRepository };
  };

  it('records the first rate-limit violation without temporarily banning the IP', async () => {
    const { useCase, banRepository } = makeUseCase(1);

    const result = await useCase.execute({
      ip: '::1',
      reason: 'rate_limit_exceeded',
      path: '/api/auth/me',
      method: 'GET',
    });

    expect(result).toEqual({
      banLevel: 0,
      bannedUntil: null,
      manualPermanentBan: false,
    });
    expect(banRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        ip: '::1',
        banLevel: 0,
        bannedUntil: null,
        manualPermanentBan: false,
      }),
    );
  });

  it('temporarily bans after repeated rate-limit violations', async () => {
    const { useCase, banRepository, violationRepository } = makeUseCase(3);

    const result = await useCase.execute({
      ip: '::1',
      reason: 'rate_limit_exceeded',
      path: '/api/auth/login',
      method: 'POST',
    });

    expect(result.banLevel).toBe(1);
    expect(result.bannedUntil).toBeInstanceOf(Date);
    expect(result.manualPermanentBan).toBe(false);
    expect(banRepository.save).toHaveBeenCalled();
    expect(violationRepository.count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        ip: '::1',
        reason: 'rate_limit_exceeded',
      }),
    });
  });

  it('audits non-rate-limit events without counting or changing the ban policy', async () => {
    const { useCase, banRepository } = makeUseCase(999);

    const result = await useCase.execute({
      ip: '::1',
      reason: 'temporary_ban_request',
      path: '/inventory/stream',
      method: 'GET',
    });

    expect(result).toEqual({
      banLevel: 0,
      bannedUntil: null,
      manualPermanentBan: false,
    });
    expect(banRepository.save).not.toHaveBeenCalled();
  });

  it('does not block the shared IP when an authenticated operator exceeds its session limit', async () => {
    const { useCase, banRepository, violationRepository } = makeUseCase(999);

    await useCase.execute({
      ip: '203.0.113.30',
      reason: 'operator_rate_limit_exceeded',
      trackerType: 'session',
      userId: 'user-1',
      sessionId: 'session-1',
    });

    expect(violationRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        countedForBan: false,
        trackerType: 'session',
        userId: 'user-1',
        sessionId: 'session-1',
      }),
    );
    expect(violationRepository.count).not.toHaveBeenCalled();
    expect(banRepository.save).not.toHaveBeenCalled();
  });

  it('counts recurrence only after the latest manual unblock', async () => {
    const policyResetAt = new Date(Date.now() - 60_000);
    const { useCase, banRepository, violationRepository } = makeUseCase(1);
    banRepository.findOne.mockResolvedValue({
      ip: '::1',
      banLevel: 0,
      bannedUntil: null,
      manualPermanentBan: false,
      policyResetAt,
    });

    const result = await useCase.execute({
      ip: '::1',
      reason: 'rate_limit_exceeded',
      path: '/inventory-documents',
      method: 'GET',
    });

    expect(result.banLevel).toBe(0);
    const countFilter = violationRepository.count.mock.calls[0][0];
    expect(countFilter.where.createdAt.value).toEqual(policyResetAt);
  });
});
