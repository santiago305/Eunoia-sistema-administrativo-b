import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AccessControlController } from 'src/modules/access-control/adapters/in/controllers/access-control.controller';
import { PermissionsGuard } from 'src/modules/access-control/adapters/in/guards/permissions.guard';
import { AccessControlService } from 'src/modules/access-control/application/services/access-control.service';
import { JwtAuthGuard } from 'src/modules/auth/adapters/in/guards/jwt-auth.guard';
import { AuthController } from 'src/modules/auth/adapters/in/controllers/auth.controller';
import { GetAuthUserUseCase } from 'src/modules/auth/application/use-cases/get-auth-user.usecase';
import { LoginAuthUseCase } from 'src/modules/auth/application/use-cases/login-auth.usecase';
import { RefreshAuthUseCase } from 'src/modules/auth/application/use-cases/refresh.auth.usecase';
import { RevokeSessionUseCase } from 'src/modules/sessions/application/use-cases/revoke-session.usecase';
import { RolesController } from 'src/modules/roles/adapters/in/controllers/roles.controller';
import { CreateRoleUseCase } from 'src/modules/roles/application/use-cases/create-role.usecase';
import { DeactivateRoleUseCase } from 'src/modules/roles/application/use-cases/deactivate-role.usecase';
import { DeleteRoleUseCase } from 'src/modules/roles/application/use-cases/delete-role.usecase';
import { GetRoleByIdUseCase } from 'src/modules/roles/application/use-cases/get-role-by-id.usecase';
import { ListRolesUseCase } from 'src/modules/roles/application/use-cases/list-roles.usecase';
import { RestoreRoleUseCase } from 'src/modules/roles/application/use-cases/restore-role.usecase';
import { UpdateRoleUseCase } from 'src/modules/roles/application/use-cases/update-role.usecase';

describe('root roles and permissions flow (e2e)', () => {
  let app: INestApplication;
  let csrfToken = '';
  let rootAgent: ReturnType<typeof request.agent>;
  let limitedAgent: ReturnType<typeof request.agent>;
  const createRoleUseCase = { execute: jest.fn() };
  const updateRoleUseCase = { execute: jest.fn() };
  const deactivateRoleUseCase = { execute: jest.fn() };
  const restoreRoleUseCase = { execute: jest.fn() };
  const accessControlService = {
    getEffectivePermissions: jest.fn(),
    assignPermissionsToRole: jest.fn(),
    listPermissions: jest.fn(),
    getUserRoles: jest.fn(),
    listUserPermissionOverrides: jest.fn(),
    getUserPreferredHomePath: jest.fn(),
    listGrantablePermissions: jest.fn(),
    replaceGrantablePermissions: jest.fn(),
    upsertUserPermissionOverride: jest.fn(),
    removeUserPermissionOverride: jest.fn(),
    listRolePermissions: jest.fn(),
    setUserPreferredHomePath: jest.fn(),
  };
  const loginAuthUseCase = {
    execute: jest.fn((params: { dto: { email: string } }) =>
      Promise.resolve({
        access_token: params.dto.email === 'limited@eunoia.local' ? 'limited-token' : 'root-token',
        refresh_token: 'refresh-token',
      }),
    ),
  };

  const login = async (agent: ReturnType<typeof request.agent>, email: string) => {
    const response = await agent
      .post('/auth/login')
      .send({ email, password: 'DevMaster_ChangeMe123!' })
      .expect(200);
    const setCookies = response.headers['set-cookie'];
    const csrfCookie = (Array.isArray(setCookies) ? setCookies : [setCookies ?? '']).find((cookie) =>
      cookie.startsWith('csrf_token='),
    );
    return csrfCookie?.split(';')[0].split('=')[1] ?? '';
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    createRoleUseCase.execute.mockResolvedValue({ message: 'Rol creado correctamente', data: { id: 'role-1' } });
    updateRoleUseCase.execute.mockResolvedValue({ message: 'Rol actualizado correctamente' });
    deactivateRoleUseCase.execute.mockResolvedValue({ message: 'Rol desactivado y usuarios reasignados' });
    restoreRoleUseCase.execute.mockResolvedValue({ message: 'Rol restaurado correctamente' });
    accessControlService.getEffectivePermissions.mockImplementation((userId: string) =>
      Promise.resolve(userId === 'root-user' ? ['*'] : []),
    );
    accessControlService.assignPermissionsToRole.mockResolvedValue({ roleId: 'role-1', permissionCodes: ['users.read'] });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AuthController, RolesController, AccessControlController],
      providers: [
        { provide: LoginAuthUseCase, useValue: loginAuthUseCase },
        { provide: RefreshAuthUseCase, useValue: { execute: jest.fn() } },
        { provide: GetAuthUserUseCase, useValue: { execute: jest.fn() } },
        { provide: RevokeSessionUseCase, useValue: { execute: jest.fn() } },
        { provide: CreateRoleUseCase, useValue: createRoleUseCase },
        { provide: ListRolesUseCase, useValue: { execute: jest.fn().mockResolvedValue([]) } },
        { provide: GetRoleByIdUseCase, useValue: { execute: jest.fn() } },
        { provide: UpdateRoleUseCase, useValue: updateRoleUseCase },
        { provide: DeleteRoleUseCase, useValue: { execute: jest.fn() } },
        { provide: DeactivateRoleUseCase, useValue: deactivateRoleUseCase },
        { provide: RestoreRoleUseCase, useValue: restoreRoleUseCase },
        { provide: AccessControlService, useValue: accessControlService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: { switchToHttp: () => { getRequest: () => { cookies: { access_token?: string }; user?: unknown } } }) => {
          const req = context.switchToHttp().getRequest();
          req.user = { id: req.cookies.access_token === 'limited-token' ? 'limited-user' : 'root-user' };
          return true;
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    await app.init();
    rootAgent = request.agent(app.getHttpServer());
    limitedAgent = request.agent(app.getHttpServer());
    csrfToken = await login(rootAgent, 'root@eunoia.local');
    await login(limitedAgent, 'limited@eunoia.local');
  });

  afterEach(async () => {
    await app.close();
  });

  it('allows the root user to manage roles and assign permissions with one request per action', async () => {
    await rootAgent.get('/roles').expect(200);
    await rootAgent.post('/roles/create').set('x-csrf-token', csrfToken).send({ description: 'Operaciones' }).expect(201);
    await rootAgent.patch('/roles/role-1').set('x-csrf-token', csrfToken).send({ description: 'Operaciones senior' }).expect(200);
    await rootAgent
      .post('/roles/role-1/deactivate')
      .set('x-csrf-token', csrfToken)
      .send({ replacementRoleId: 'role-2', confirmationText: 'Eliminar operaciones senior' })
      .expect(201);
    await rootAgent.patch('/roles/role-1/restore').set('x-csrf-token', csrfToken).expect(200);
    await rootAgent
      .patch('/access-control/roles/role-1/permissions')
      .set('x-csrf-token', csrfToken)
      .send({ permissionCodes: ['users.read'] })
      .expect(200);

    expect(createRoleUseCase.execute).toHaveBeenCalledTimes(1);
    expect(updateRoleUseCase.execute).toHaveBeenCalledTimes(1);
    expect(deactivateRoleUseCase.execute).toHaveBeenCalledTimes(1);
    expect(restoreRoleUseCase.execute).toHaveBeenCalledTimes(1);
    expect(accessControlService.assignPermissionsToRole).toHaveBeenCalledTimes(1);
  });

  it('rejects a user without role permissions', async () => {
    await limitedAgent.get('/roles').expect(403);
    expect(createRoleUseCase.execute).not.toHaveBeenCalled();
  });

  it('rejects an invalid CSRF token without creating or assigning anything', async () => {
    await rootAgent.post('/roles/create').set('x-csrf-token', 'invalid').send({ description: 'Bloqueado' }).expect(403);
    await rootAgent
      .patch('/access-control/roles/role-1/permissions')
      .set('x-csrf-token', 'invalid')
      .send({ permissionCodes: ['users.read'] })
      .expect(403);

    expect(createRoleUseCase.execute).not.toHaveBeenCalled();
    expect(accessControlService.assignPermissionsToRole).not.toHaveBeenCalled();
  });
});
