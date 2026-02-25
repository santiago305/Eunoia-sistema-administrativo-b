import { NotFoundException } from '@nestjs/common';
import { RemoveAvatarUseCase } from './remove-avatar.usecase';
import { Email, Password, RoleId, User } from 'src/modules/users/domain';
import { successResponse } from 'src/shared/response-standard/response';

describe('RemoveAvatarUseCase', () => {
  const makeUseCase = (overrides?: { userRepository?: any; fileStorage?: any }) => {
    const userRepository = overrides?.userRepository ?? {
      findById: jest.fn(),
      save: jest.fn(),
    };
    const fileStorage = overrides?.fileStorage ?? {
      delete: jest.fn().mockResolvedValue(true),
    };
    return new RemoveAvatarUseCase(userRepository, fileStorage);
  };

  it('clears avatar in db and deletes local file when avatar is local', async () => {
    const domainUser = new User(
      'user-1',
      'Ana',
      new Email('ana@example.com'),
      new Password('hash'),
      new RoleId('role-1'),
      false,
      '/api/assets/users/avatar.webp'
    );
    const savedUser = new User(
      'user-1',
      'Ana',
      new Email('ana@example.com'),
      new Password('hash'),
      new RoleId('role-1'),
      false,
      ''
    );
    const userRepository = {
      findById: jest.fn().mockResolvedValue(domainUser),
      save: jest.fn().mockResolvedValue(savedUser),
    };
    const fileStorage = { delete: jest.fn().mockResolvedValue(true) };
    const useCase = makeUseCase({ userRepository, fileStorage });

    const result = await useCase.execute('user-1');

    expect(fileStorage.delete).toHaveBeenCalledWith('/api/assets/users/avatar.webp');
    expect(result).toEqual(
      successResponse('Avatar actualizado correctamente', {
        id: 'user-1',
        avatarUrl: '',
      })
    );
  });

  it('does not try to delete external avatar urls', async () => {
    const domainUser = new User(
      'user-1',
      'Ana',
      new Email('ana@example.com'),
      new Password('hash'),
      new RoleId('role-1'),
      false,
      'https://cdn.example.com/avatar.png'
    );
    const userRepository = {
      findById: jest.fn().mockResolvedValue(domainUser),
      save: jest.fn().mockResolvedValue({ id: 'user-1', avatarUrl: '' }),
    };
    const fileStorage = { delete: jest.fn().mockResolvedValue(true) };
    const useCase = makeUseCase({ userRepository, fileStorage });

    await useCase.execute('user-1');

    expect(fileStorage.delete).not.toHaveBeenCalled();
  });

  it('throws not found when user does not exist', async () => {
    const useCase = makeUseCase({
      userRepository: {
        findById: jest.fn().mockResolvedValue(null),
        save: jest.fn(),
      },
    });

    await expect(useCase.execute('user-1')).rejects.toBeInstanceOf(NotFoundException);
  });
});
