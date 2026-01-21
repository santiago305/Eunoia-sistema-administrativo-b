import { ListActiveRolesUseCase } from './list-active-role.usecase';

describe('ListActiveRolesUseCase', () => {
  const makeUseCase = (overrides?: { roleReadRepository?: any }) => {
    const roleReadRepository = {
      listRoles: jest.fn().mockResolvedValue([]),
      findById: jest.fn(),
      findByDescription: jest.fn(),
      existsByDescription: jest.fn(),
      ...overrides?.roleReadRepository,
    };

    return new ListActiveRolesUseCase(roleReadRepository);
  };

  it('returns active roles', async () => {
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

    expect(roleReadRepository.listRoles).toHaveBeenCalledWith({
      includeDeleted: false,
    });
    expect(result).toEqual(expected);
  });
});
