import { InvalidUserIdError } from 'src/modules/sessions/domain/errors/invalid-user.error';
import { RevokeAllSessionsLessMeUseCase } from './revoke-all-session-less-me.usecase';

describe('RevokeAllSessionsLessMeUseCase', () => {
  const makeUseCase = (overrides?: { sessionRepository?: any }) => {
    const sessionRepository = overrides?.sessionRepository ?? {
      revokeAllForUserExceptDevice: jest.fn(),
    };
    return new RevokeAllSessionsLessMeUseCase(sessionRepository);
  };

  it('revokes all sessions except current device', async () => {
    const sessionRepository = {
      revokeAllForUserExceptDevice: jest.fn().mockResolvedValue(undefined),
    };
    const useCase = makeUseCase({ sessionRepository });

    const result = await useCase.execute('user-1', 'device-1');

    expect(result).toEqual({ revoked: true });
    expect(sessionRepository.revokeAllForUserExceptDevice).toHaveBeenCalled();
  });

  it('throws when userId is invalid', async () => {
    const useCase = makeUseCase();

    await expect(useCase.execute('', 'device-1')).rejects.toBeInstanceOf(
      InvalidUserIdError,
    );
  });
});
