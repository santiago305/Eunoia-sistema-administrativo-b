import { ManageManualIpBlacklistUseCase } from './manage-manual-ip-blacklist.usecase';

describe('ManageManualIpBlacklistUseCase', () => {
  it('clears Redis counters and resets policy recurrence when an IP is unblocked', async () => {
    const existingBan = {
      ip: '203.0.113.25',
      manualPermanentBan: false,
      banLevel: 3,
      bannedUntil: new Date(Date.now() + 60_000),
      reviewedBy: null,
      lastReason: 'rate_limit_exceeded',
      policyResetAt: null,
    };
    const banRepository = {
      findOne: jest.fn().mockResolvedValue(existingBan),
      save: jest.fn(async (value) => value),
    };
    const violationRepository = {
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => value),
    };
    const resolveClientIpUseCase = {
      normalizeIp: jest.fn((ip: string) => ip),
    };
    const throttlerStorage = {
      clearTracker: jest.fn().mockResolvedValue(3),
    };
    const useCase = new ManageManualIpBlacklistUseCase(
      banRepository as any,
      violationRepository as any,
      resolveClientIpUseCase as any,
      throttlerStorage as any,
    );

    const result = await useCase.removeManualPermanentBan(
      '203.0.113.25',
      'admin@eunoia.test',
    );

    expect(result).toEqual(
      expect.objectContaining({
        banLevel: 0,
        bannedUntil: null,
        lastReason: 'manual_unban',
        policyResetAt: expect.any(Date),
      }),
    );
    expect(throttlerStorage.clearTracker).toHaveBeenCalledWith('203.0.113.25');
    expect(violationRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        reason: 'manual_unban',
        actor: 'admin@eunoia.test',
        countedForBan: false,
      }),
    );
  });
});
