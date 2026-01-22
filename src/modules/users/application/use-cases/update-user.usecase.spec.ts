import { UnauthorizedException } from '@nestjs/common';
import { UpdateUserUseCase } from './update-user.usecase';
import { Email, Password, RoleId, User } from 'src/modules/users/domain';
import { successResponse } from 'src/shared/response-standard/response';

describe('UpdateUserUseCase', () => {
  const makeUseCase = (overrides?: { userRepository?: any; userReadRepository?: any }) => {
    const userRepository = overrides?.userRepository ?? {
      existsByIdAndDeleted: jest.fn().mockResolvedValue(true),
      findById: jest.fn(),
      existsByEmail: jest.fn().mockResolvedValue(false),
      save: jest.fn(),
    };
    const userReadRepository = overrides?.userReadRepository ?? {
      findPublicById: jest.fn().mockResolvedValue({ id: 'user-1' }),
    };
    return new UpdateUserUseCase(userRepository, userReadRepository);
  };

  it('updates user for owner', async () => {
    const domainUser = new User(
      'user-1',
      'Ana',
      new Email('ana@example.com'),
      new Password('hash'),
      new RoleId('role-1')
    );
    const userRepository = {
      existsByIdAndDeleted: jest.fn().mockResolvedValue(true),
      findById: jest.fn().mockResolvedValue(domainUser),
      existsByEmail: jest.fn().mockResolvedValue(false),
      save: jest.fn().mockResolvedValue(domainUser),
    };
    const useCase = makeUseCase({ userRepository });

    const result = await useCase.execute(
      'user-1',
      { name: 'Ana Maria' } as any,
      'user-1'
    );

    expect(result).toEqual(successResponse('Modificacion terminada', { id: 'user-1' }));
  });

  it('rejects when requester differs', async () => {
    const useCase = makeUseCase();

    await expect(
      useCase.execute('user-1', {} as any, 'user-2')
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects when email already exists', async () => {
    const domainUser = new User(
      'user-1',
      'Ana',
      new Email('ana@example.com'),
      new Password('hash'),
      new RoleId('role-1')
    );
    const useCase = makeUseCase({
      userRepository: {
        existsByIdAndDeleted: jest.fn().mockResolvedValue(true),
        findById: jest.fn().mockResolvedValue(domainUser),
        existsByEmail: jest.fn().mockResolvedValue(true),
      },
    });

    await expect(
      useCase.execute('user-1', { email: 'other@example.com' } as any, 'user-1')
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects role change', async () => {
    const useCase = makeUseCase();

    await expect(
      useCase.execute('user-1', { roleId: 'role-2' } as any, 'user-1')
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
