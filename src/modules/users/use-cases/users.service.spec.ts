import { UsersService } from './users.service';
import { errorResponse, successResponse } from 'src/shared/response-standard/response';
import { UserReadRepository } from 'src/modules/users/ports/user-read.repository';
import { UserRepository } from 'src/modules/users/domain';

describe('UsersService', () => {
  const makeService = (overrides?: {
    userReadRepository?: Partial<UserReadRepository>;
    userDomainRepository?: Partial<UserRepository>;
  }) => {
    const userRepository = {} as any;
    const userDomainRepository = overrides?.userDomainRepository ?? {};
    const userReadRepository = overrides?.userReadRepository ?? {};
    const rolesService = {} as any;

    return new UsersService(
      userRepository,
      userDomainRepository as UserRepository,
      userReadRepository as UserReadRepository,
      rolesService
    );
  };

  it('findAll returns list from read repository', async () => {
    const service = makeService({
      userReadRepository: {
        listUsers: jest.fn().mockResolvedValue([{ id: 'user-1' }]),
      },
    });

    const result = await service.findAll({ page: 1 });
    expect(result).toEqual([{ id: 'user-1' }]);
  });

  it('findActives passes whereClause to read repository', async () => {
    const listUsers = jest.fn().mockResolvedValue([]);
    const service = makeService({
      userReadRepository: { listUsers },
    });

    await service.findActives({ page: 1 });
    expect(listUsers).toHaveBeenCalledWith(
      expect.objectContaining({ whereClause: 'role.deleted = false' })
    );
  });

  it('findByEmail returns error response when not found', async () => {
    const service = makeService({
      userReadRepository: {
        findPublicByEmail: jest.fn().mockResolvedValue(null),
      },
    });

    const result = await service.findByEmail('ana@example.com');
    expect(result).toEqual(errorResponse('No hemos encontrado el usuario'));
  });

  it('findByEmail returns success response when found', async () => {
    const service = makeService({
      userReadRepository: {
        findPublicByEmail: jest.fn().mockResolvedValue({
          id: 'user-1',
          email: 'ana@example.com',
          roleDescription: 'admin',
        }),
      },
    });

    const result = await service.findByEmail('ana@example.com');
    expect(result).toEqual(
      successResponse('Usuario encontrado', {
        id: 'user-1',
        email: 'ana@example.com',
        rol: 'admin',
      })
    );
  });
});
