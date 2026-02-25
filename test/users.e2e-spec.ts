import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { UsersController } from 'src/modules/users/adapters/in/controllers/users.controller';
import { ChangePasswordUseCase } from 'src/modules/users/application/use-cases/change-password.usecase';
import { CreateUserUseCase } from 'src/modules/users/application/use-cases/create-user.usecase';
import { DeleteUserUseCase } from 'src/modules/users/application/use-cases/delete-user.usecase';
import { GetOwnUserUseCase } from 'src/modules/users/application/use-cases/get-own-user.usecase';
import { GetUserByEmailUseCase } from 'src/modules/users/application/use-cases/get-user-by-email.usecase';
import { GetUserUseCase } from 'src/modules/users/application/use-cases/get-user.usecase';
import { ListUsersUseCase } from 'src/modules/users/application/use-cases/list-users.usecase';
import { RemoveAvatarUseCase } from 'src/modules/users/application/use-cases/remove-avatar.usecase';
import { RestoreUserUseCase } from 'src/modules/users/application/use-cases/restore-user.usecase';
import { UpdateAvatarUseCase } from 'src/modules/users/application/use-cases/update-avatar.usecase';
import { UpdateUserUseCase } from 'src/modules/users/application/use-cases/update-user.usecase';
import { JwtAuthGuard } from 'src/modules/auth/adapters/in/guards/jwt-auth.guard';
import { RolesGuard } from 'src/shared/utilidades/guards/roles.guard';
import { RoleType } from 'src/shared/constantes/constants';

describe('UsersController (e2e)', () => {
  let app: INestApplication;
  const listUsersUseCase = { execute: jest.fn() };
  const removeAvatarUseCase = { execute: jest.fn() };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: CreateUserUseCase, useValue: { execute: jest.fn() } },
        { provide: UpdateUserUseCase, useValue: { execute: jest.fn() } },
        { provide: ChangePasswordUseCase, useValue: { execute: jest.fn() } },
        { provide: ListUsersUseCase, useValue: listUsersUseCase },
        { provide: GetUserUseCase, useValue: { execute: jest.fn() } },
        { provide: GetUserByEmailUseCase, useValue: { execute: jest.fn() } },
        { provide: GetOwnUserUseCase, useValue: { execute: jest.fn() } },
        { provide: DeleteUserUseCase, useValue: { execute: jest.fn() } },
        { provide: RestoreUserUseCase, useValue: { execute: jest.fn() } },
        { provide: UpdateAvatarUseCase, useValue: { execute: jest.fn() } },
        { provide: RemoveAvatarUseCase, useValue: removeAvatarUseCase },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context) => {
          const req = context.switchToHttp().getRequest();
          req.user = { id: 'user-1', role: RoleType.ADMIN };
          return true;
        },
      })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/users/findAll (GET)', async () => {
    listUsersUseCase.execute.mockResolvedValue([{ id: 'user-1' }]);

    await request(app.getHttpServer())
      .get('/users/findAll?page=1')
      .expect(200)
      .expect([{ id: 'user-1' }]);

    expect(listUsersUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'all' }),
      RoleType.ADMIN
    );
  });

  it('/users/actives (GET)', async () => {
    listUsersUseCase.execute.mockResolvedValue([{ id: 'user-2' }]);

    await request(app.getHttpServer())
      .get('/users/actives?page=1')
      .expect(200)
      .expect([{ id: 'user-2' }]);

    expect(listUsersUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'active' }),
      RoleType.ADMIN
    );
  });

  it('/users/desactive (GET)', async () => {
    listUsersUseCase.execute.mockResolvedValue([{ id: 'user-3' }]);

    await request(app.getHttpServer())
      .get('/users/desactive?page=1')
      .expect(200)
      .expect([{ id: 'user-3' }]);

    expect(listUsersUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'inactive' }),
      RoleType.ADMIN
    );
  });

  it('/users/me/avatar (DELETE)', async () => {
    removeAvatarUseCase.execute.mockResolvedValue({ ok: true });

    await request(app.getHttpServer())
      .delete('/users/me/avatar')
      .expect(200)
      .expect({ ok: true });

    expect(removeAvatarUseCase.execute).toHaveBeenCalledWith('user-1');
  });
});
