import { ListUsersUseCase } from './list-users.usecase';
import { GetUserUseCase } from './get-user.usecase';
import { GetUserByEmailUseCase } from './get-user-by-email.usecase';
import { RoleType } from 'src/shared/constantes/constants';

describe('Users security responses', () => {
  it('never returns password in list users response', async () => {
    const listUsersUseCase = new ListUsersUseCase({
      listUsers: jest.fn().mockResolvedValue([
        {
          id: 'user-1',
          name: 'Ana',
          email: 'ana@example.com',
          telefono: '555',
          rol: RoleType.ADVISER,
          roleId: 'role-1',
          deleted: false,
          createdAt: new Date(),
          password: 'should-not-leak',
        },
      ]),
    } as any);

    const result = await listUsersUseCase.execute({ page: 1 }, RoleType.ADMIN);
    expect(result[0]).not.toHaveProperty('password');
  });

  it('returns only safe fields for detail and email queries', async () => {
    const getUserUseCase = new GetUserUseCase({
      findManagementById: jest.fn().mockResolvedValue({
        id: 'user-1',
        name: 'Ana',
        email: 'ana@example.com',
        telefono: '555',
        avatarUrl: '/api/assets/users/a.webp',
        deleted: false,
        role: { id: 'role-1', description: RoleType.ADVISER, password: 'x' },
      }),
    } as any);

    const getUserByEmailUseCase = new GetUserByEmailUseCase({
      findManagementByEmail: jest.fn().mockResolvedValue({
        id: 'user-1',
        email: 'ana@example.com',
        roleDescription: RoleType.ADVISER,
        deleted: false,
        password: 'should-not-leak',
      }),
    } as any);

    const detail = await getUserUseCase.execute('user-1', RoleType.ADMIN);
    const byEmail = await getUserByEmailUseCase.execute('ana@example.com', RoleType.ADMIN);

    expect(detail.data).not.toHaveProperty('password');
    expect(byEmail.data).not.toHaveProperty('password');
  });
});
