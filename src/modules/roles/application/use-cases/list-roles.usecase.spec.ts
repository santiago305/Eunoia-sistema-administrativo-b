import { ListRolesUseCase } from './list-roles.usecase';

describe('ListRolesUseCase', () => {
  const makeUseCase = (overrides?: { roleReadRepository?: any }) => {
    const roleReadRepository = {
      listRoles: jest.fn().mockResolvedValue([]),
      findById: jest.fn(),
      findByDescription: jest.fn(),
      existsByDescription: jest.fn(),
      ...overrides?.roleReadRepository,
    };

    return new ListRolesUseCase(roleReadRepository);
  };

  it('returns roles', async () => {
    const expected = [
      {
        id: 'role-1',
        description: 'Admin',
        deleted: false,
        createdAt: new Date(),
      },
    ];
    const roleReadRepository = {
      listRoles: jest.fn().mockResolvedValue(expected),
    };
    const useCase = makeUseCase({ roleReadRepository });

    const result = await useCase.execute();

    expect(roleReadRepository.listRoles).toHaveBeenCalledWith();
    expect(result).toEqual(expected);
  });
});
