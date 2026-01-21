import { GetRoleByIdUseCase } from './get-role-by-id.usecase';

describe('GetRoleByIdUseCase', () => {
  const makeUseCase = (overrides?: { roleReadRepository?: any }) => {
    const roleReadRepository = {
      findById: jest.fn().mockResolvedValue({
        id: 'role-1',
        description: 'Admin',
        deleted: false,
        createdAt: new Date(),
      }),
      findByDescription: jest.fn(),
      listRoles: jest.fn(),
      existsByDescription: jest.fn(),
      ...overrides?.roleReadRepository,
    };

    return new GetRoleByIdUseCase(roleReadRepository);
  };

  it('returns role when found', async () => {
    const expected = {
      id: 'role-1',
      description: 'Admin',
      deleted: false,
      createdAt: new Date(),
    };
    const useCase = makeUseCase({
      roleReadRepository: { findById: jest.fn().mockResolvedValue(expected) },
    });

    const result = await useCase.execute('role-1');

    expect(result).toEqual(expected);
  });

  it('returns null when not found', async () => {
    const useCase = makeUseCase({
      roleReadRepository: { findById: jest.fn().mockResolvedValue(null) },
    });

    const result = await useCase.execute('role-1');

    expect(result).toBeNull();
  });
});
