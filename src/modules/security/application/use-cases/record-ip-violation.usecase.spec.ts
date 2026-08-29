import { RecordIpViolationUseCase } from './record-ip-violation.usecase';

describe('RecordIpViolationUseCase', () => {
  it('stores an audit event without touching the ban repository', async () => {
    const violationRepository = {
      create: jest.fn((value) => value),
      save: jest.fn().mockResolvedValue(undefined),
    };
    const resolveClientIpUseCase = {
      normalizeIp: jest.fn((ip: string) => ip.trim()),
    };
    const useCase = new RecordIpViolationUseCase(
      violationRepository as any,
      resolveClientIpUseCase as any,
    );

    await useCase.execute({
      ip: ' 203.0.113.20 ',
      reason: 'temporary_ban_request',
      path: '/inventory/stream',
      method: 'GET',
      userAgent: 'test-agent',
    });

    expect(resolveClientIpUseCase.normalizeIp).toHaveBeenCalledWith(
      ' 203.0.113.20 ',
    );
    expect(violationRepository.create).toHaveBeenCalledWith({
      ip: '203.0.113.20',
      reason: 'temporary_ban_request',
      path: '/inventory/stream',
      method: 'GET',
      userAgent: 'test-agent',
    });
    expect(violationRepository.save).toHaveBeenCalledTimes(1);
  });
});
