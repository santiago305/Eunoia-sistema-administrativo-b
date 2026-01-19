import { UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { ChangePasswordUseCase } from './change-password.usecase';
import { Email, Password, RoleId, User } from 'src/modules/users/domain';
import { successResponse } from 'src/shared/response-standard/response';

jest.mock('argon2', () => ({
  hash: jest.fn(),
  verify: jest.fn(),
  argon2id: 2,
}));

describe('ChangePasswordUseCase', () => {
  const makeUseCase = (overrides?: { userRepository?: any }) => {
    const userRepository = overrides?.userRepository ?? {
      findById: jest.fn(),
      save: jest.fn(),
    };
    return new ChangePasswordUseCase(userRepository);
  };

  it('changes password for owner', async () => {
    (argon2.verify as jest.Mock).mockResolvedValue(true);
    (argon2.hash as jest.Mock).mockResolvedValue('hashed');
    const domainUser = new User(
      'user-1',
      'Ana',
      new Email('ana@example.com'),
      new Password('old-hash'),
      new RoleId('role-1')
    );
    const userRepository = {
      findById: jest.fn().mockResolvedValue(domainUser),
      save: jest.fn().mockResolvedValue(domainUser),
    };
    const useCase = makeUseCase({ userRepository });

    const result = await useCase.execute('user-1', 'old', 'new', 'user-1');

    expect(result).toEqual(successResponse('Contrasena actualizada correctamente'));
    expect(userRepository.save).toHaveBeenCalled();
  });

  it('rejects when requester differs', async () => {
    const useCase = makeUseCase();

    await expect(
      useCase.execute('user-1', 'old', 'new', 'user-2')
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects blank new password', async () => {
    const useCase = makeUseCase();

    await expect(
      useCase.execute('user-1', 'old', ' ', 'user-1')
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects when current password mismatch', async () => {
    (argon2.verify as jest.Mock).mockResolvedValue(false);
    const domainUser = new User(
      'user-1',
      'Ana',
      new Email('ana@example.com'),
      new Password('old-hash'),
      new RoleId('role-1')
    );
    const userRepository = {
      findById: jest.fn().mockResolvedValue(domainUser),
    };
    const useCase = makeUseCase({ userRepository });

    await expect(
      useCase.execute('user-1', 'bad', 'new', 'user-1')
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
