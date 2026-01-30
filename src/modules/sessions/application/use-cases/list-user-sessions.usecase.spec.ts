import { InvalidUserIdError } from 'src/modules/sessions/domain/errors/invalid-user.error';
import { ListUserSessionsUseCase } from './list-user-sessions.usecase';

describe('ListUserSessionsUseCase', () => {
  const makeUseCase = (overrides?: { sessionReadRepository?: any }) => {
    const sessionReadRepository = overrides?.sessionReadRepository ?? {
      listUserSessions: jest.fn(),
    };
    return new ListUserSessionsUseCase(sessionReadRepository);
  };

  it('lists user sessions', async () => {
    const sessions = [{ id: 's1' }];
    const useCase = makeUseCase({
      sessionReadRepository: {
        listUserSessions: jest.fn().mockResolvedValue(sessions),
      },
    });

    const result = await useCase.execute('user-1');

    expect(result).toEqual(sessions);
  });

  it('throws when userId is invalid', async () => {
    const useCase = makeUseCase();

    await expect(useCase.execute('')).rejects.toBeInstanceOf(InvalidUserIdError);
  });

  it('passes include flags', async () => {
    const listUserSessions = jest.fn().mockResolvedValue([]);
    const useCase = makeUseCase({ sessionReadRepository: { listUserSessions } });

    await useCase.execute('user-1', { includeExpired: true, includeRevoked: true });

    expect(listUserSessions).toHaveBeenCalledWith('user-1', {
      includeRevoked: true,
      includeExpired: true,
    });
  });
});
