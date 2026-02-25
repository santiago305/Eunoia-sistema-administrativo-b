import { UnauthorizedException } from '@nestjs/common';
import { UpdateAvatarUseCase } from './update-avatar.usecase';
import { Email, Password, RoleId, User } from 'src/modules/users/domain';
import { successResponse } from 'src/shared/response-standard/response';

describe('UpdateAvatarUseCase', () => {
  const makeUseCase = (overrides?: { userRepository?: any }) => {
    const userRepository = overrides?.userRepository ?? {
      findById: jest.fn(),
      save: jest.fn(),
    };
    return new UpdateAvatarUseCase(userRepository);
  };

  it('updates avatar for authenticated user', async () => {
    const domainUser = new User(
      'user-1',
      'Ana',
      new Email('ana@example.com'),
      new Password('hash'),
      new RoleId('role-1')
    );
    const userRepository = {
      findById: jest.fn().mockResolvedValue(domainUser),
      save: jest.fn().mockResolvedValue(domainUser),
    };
    const useCase = makeUseCase({ userRepository });

    const result = await useCase.execute('user-1', '/assets/avatar.png');

    expect(result).toEqual(
      successResponse('Avatar actualizado correctamente', {
        id: 'user-1',
        name: 'Ana',
        email: 'ana@example.com',
        avatarUrl: '/assets/avatar.png',
      })
    );
  });

  it('rejects when user does not exist', async () => {
    const useCase = makeUseCase({
      userRepository: {
        findById: jest.fn().mockResolvedValue(null),
        save: jest.fn(),
      },
    });

    await expect(
      useCase.execute('user-1', '/assets/avatar.png')
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
