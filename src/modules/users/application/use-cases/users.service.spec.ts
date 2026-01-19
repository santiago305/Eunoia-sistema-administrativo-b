import { UsersService } from './users.service';
import { RoleType } from 'src/shared/constantes/constants';
import { GetUserByEmailUseCase } from './get-user-by-email.usecase';
import { ListActiveUsersUseCase } from './list-active-users.usecase';
import { ListUsersUseCase } from './list-users.usecase';

describe('UsersService', () => {
  const makeService = (overrides?: Partial<{
    listUsersUseCase: ListUsersUseCase;
    listActiveUsersUseCase: ListActiveUsersUseCase;
    getUserByEmailUseCase: GetUserByEmailUseCase;
  }>) => {
    const defaults = { execute: jest.fn() };

    return new UsersService(
      { execute: jest.fn() } as any,
      { execute: jest.fn() } as any,
      { execute: jest.fn() } as any,
      (overrides?.listUsersUseCase ?? { ...defaults }) as ListUsersUseCase,
      (overrides?.listActiveUsersUseCase ?? { ...defaults }) as ListActiveUsersUseCase,
      { execute: jest.fn() } as any,
      (overrides?.getUserByEmailUseCase ?? { ...defaults }) as GetUserByEmailUseCase,
      { execute: jest.fn() } as any,
      { execute: jest.fn() } as any,
      { execute: jest.fn() } as any,
      { execute: jest.fn() } as any,
      { execute: jest.fn() } as any
    );
  };

  it('findAll delegates to listUsersUseCase', async () => {
    const listUsersUseCase = {
      execute: jest.fn().mockResolvedValue([{ id: 'user-1' }]),
    } as unknown as ListUsersUseCase;
    const service = makeService({ listUsersUseCase });

    const result = await service.findAll({ page: 1 }, RoleType.ADMIN);
    expect(result).toEqual([{ id: 'user-1' }]);
    expect(listUsersUseCase.execute).toHaveBeenCalledWith({ page: 1 }, RoleType.ADMIN);
  });

  it('findActives delegates to listActiveUsersUseCase', async () => {
    const listActiveUsersUseCase = {
      execute: jest.fn().mockResolvedValue([]),
    } as unknown as ListActiveUsersUseCase;
    const service = makeService({ listActiveUsersUseCase });

    await service.findActives({ page: 1 }, RoleType.ADMIN);
    expect(listActiveUsersUseCase.execute).toHaveBeenCalledWith({ page: 1 }, RoleType.ADMIN);
  });

  it('findByEmail delegates to getUserByEmailUseCase', async () => {
    const getUserByEmailUseCase = {
      execute: jest.fn().mockResolvedValue({ ok: true }),
    } as unknown as GetUserByEmailUseCase;
    const service = makeService({ getUserByEmailUseCase });

    const result = await service.findByEmail('ana@example.com', RoleType.ADMIN);
    expect(result).toEqual({ ok: true });
    expect(getUserByEmailUseCase.execute).toHaveBeenCalledWith('ana@example.com', RoleType.ADMIN);
  });
});
