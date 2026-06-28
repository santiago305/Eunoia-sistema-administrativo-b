import { RegisterIpViolationAndApplyPolicyUseCase } from './register-ip-violation-and-apply-policy.usecase';

describe('RegisterIpViolationAndApplyPolicyUseCase', () => {
  const makeUseCase = (violationsInWindow: number) => {
    const violationRepository = {
      create: jest.fn((value) => value),
      save: jest.fn().mockResolvedValue(undefined),
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

    return { useCase, banRepository };
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
    const { useCase } = makeUseCase(3);

    const result = await useCase.execute({
      ip: '::1',
      reason: 'rate_limit_exceeded',
      path: '/api/auth/login',
      method: 'POST',
    });

    expect(result.banLevel).toBe(1);
    expect(result.bannedUntil).toBeInstanceOf(Date);
    expect(result.manualPermanentBan).toBe(false);
  });
});
