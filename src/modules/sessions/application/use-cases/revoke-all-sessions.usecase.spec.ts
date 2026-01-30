import { InvalidUserIdError } from 'src/modules/sessions/domain/errors/invalid-user.error';
import { RevokeAllSessionsUseCase } from './revoke-all-sessions.usecase';

describe('RevokeAllSessionsUseCase', () => {
  const makeUseCase = (overrides?: { sessionRepository?: any }) => {
    const sessionRepository = overrides?.sessionRepository ?? {
      revokeAllForUser: jest.fn(),
    };
    return new RevokeAllSessionsUseCase(sessionRepository);
  };

  it('revokes all sessions for user', async () => {
    const sessionRepository = { revokeAllForUser: jest.fn().mockResolvedValue(undefined) };
    const useCase = makeUseCase({ sessionRepository });

    const result = await useCase.execute('user-1');

    expect(result).toEqual({ revoked: true });
    expect(sessionRepository.revokeAllForUser).toHaveBeenCalled();
  });

  it('throws when userId is invalid', async () => {
    const useCase = makeUseCase();

    await expect(useCase.execute('')).rejects.toBeInstanceOf(InvalidUserIdError);
  });
});
