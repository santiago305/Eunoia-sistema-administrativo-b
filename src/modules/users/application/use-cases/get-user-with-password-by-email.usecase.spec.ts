import { GetUserWithPasswordByEmailUseCase } from './get-user-with-password-by-email.usecase';

describe('GetUserWithPasswordByEmailUseCase', () => {
  const makeUseCase = (overrides?: { userReadRepository?: any }) => {
    const userReadRepository = overrides?.userReadRepository ?? {
      findWithPasswordByEmail: jest.fn(),
    };
    return new GetUserWithPasswordByEmailUseCase(userReadRepository);
  };

  it('returns null when not found', async () => {
    const useCase = makeUseCase({
      userReadRepository: { findWithPasswordByEmail: jest.fn().mockResolvedValue(null) },
    });

    const result = await useCase.execute('ana@example.com');
    expect(result).toBeNull();
  });

  it('maps response when found', async () => {
    const useCase = makeUseCase({
      userReadRepository: {
        findWithPasswordByEmail: jest.fn().mockResolvedValue({
          id: 'user-1',
          email: 'ana@example.com',
          password: 'hash',
          roleDescription: 'admin',
        }),
      },
    });

    const result = await useCase.execute('ana@example.com');
    expect(result).toEqual({
      id: 'user-1',
      email: 'ana@example.com',
      password: 'hash',
      role: { description: 'admin' },
    });
  });
});
