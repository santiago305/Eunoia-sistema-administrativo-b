import { UnauthorizedException } from '@nestjs/common';
import { CreateSessionUseCase } from './create-session.usecase';

const makeSession = (overrides?: Partial<any>) => ({
  id: 'session-1',
  userId: 'user-1',
  deviceId: 'device-1',
  deviceName: 'Laptop',
  userAgent: 'UA',
  ipAddress: '127.0.0.1',
  refreshTokenHash: 'hash',
  createdAt: new Date('2026-01-01T00:00:00Z'),
  lastSeenAt: new Date('2026-01-01T00:00:00Z'),
  revokedAt: null,
  expiresAt: new Date('2026-02-01T00:00:00Z'),
  ...overrides,
});

describe('CreateSessionUseCase', () => {
  const makeUseCase = (overrides?: { sessionRepository?: any }) => {
    const sessionRepository = overrides?.sessionRepository ?? {
      save: jest.fn(),
    };
    return new CreateSessionUseCase(sessionRepository);
  };

  it('creates a session and returns it', async () => {
    const session = makeSession();
    const useCase = makeUseCase({
      sessionRepository: { save: jest.fn().mockResolvedValue(session) },
    });

    const result = await useCase.execute({
      userId: 'user-1',
      deviceId: 'device-1',
      deviceName: 'Laptop',
      userAgent: 'UA',
      ipAddress: '127.0.0.1',
      refreshTokenHash: 'hash',
      expiresAt: new Date('2026-02-01T00:00:00Z'),
    });

    expect(result).toEqual(session);
  });

  it('throws when deviceId is invalid', async () => {
    const useCase = makeUseCase();

    await expect(
      useCase.execute({
        userId: 'user-1',
        deviceId: '   ',
        refreshTokenHash: 'hash',
        expiresAt: new Date('2026-02-01T00:00:00Z'),
      })
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('throws when refreshTokenHash is invalid', async () => {
    const useCase = makeUseCase();

    await expect(
      useCase.execute({
        userId: 'user-1',
        deviceId: 'device-1',
        refreshTokenHash: ' ',
        expiresAt: new Date('2026-02-01T00:00:00Z'),
      })
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
