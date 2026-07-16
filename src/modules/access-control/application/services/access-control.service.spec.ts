import { ForbiddenException } from '@nestjs/common';
import { AccessControlService } from './access-control.service';
import { PermissionEffect } from '../../adapters/out/persistence/typeorm/entities/user-permission-override.entity';

type RepoMock<T = any> = {
  findOne: jest.Mock;
  find: jest.Mock;
  create: jest.Mock;
  save: jest.Mock;
  delete: jest.Mock;
} & T;

const makeRepo = (): RepoMock => ({
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn((value) => value),
  save: jest.fn(async (value) => value),
  delete: jest.fn(),
});

describe('AccessControlService (fase 6 reglas finales)', () => {
  let userRepository: RepoMock;
  let roleRepository: RepoMock;
  let permissionRepository: RepoMock;
  let rolePermissionRepository: RepoMock;
  let userPermissionOverrideRepository: RepoMock;
  let userGrantablePermissionRepository: RepoMock;
  let service: AccessControlService;

  beforeEach(() => {
    userRepository = makeRepo();
    roleRepository = makeRepo();
    permissionRepository = makeRepo();
    rolePermissionRepository = makeRepo();
    userPermissionOverrideRepository = makeRepo();
    userGrantablePermissionRepository = makeRepo();

    service = new AccessControlService(
      userRepository as any,
      roleRepository as any,
      permissionRepository as any,
      rolePermissionRepository as any,
      userPermissionOverrideRepository as any,
      userGrantablePermissionRepository as any,
    );
  });

  describe('getEffectivePermissions', () => {
    it('superadmin sin rol obtiene todos los permisos activos', async () => {
      userRepository.findOne.mockResolvedValue({
        id: 'master',
        isSuperAdmin: true,
        role: null,
      });
      permissionRepository.find.mockResolvedValue([
        { code: 'users.create' },
        { code: 'catalog.read' },
      ]);

      const result = await service.getEffectivePermissions('master');

      expect(result).toEqual(['*', 'catalog.read', 'users.create']);
      expect(rolePermissionRepository.find).not.toHaveBeenCalled();
      expect(userPermissionOverrideRepository.find).not.toHaveBeenCalled();
    });

    it('superadmin conserva permiso total aunque falte un permiso concreto en catalogo', async () => {
      userRepository.findOne.mockResolvedValue({
        id: 'master',
        isSuperAdmin: true,
        role: null,
      });
      permissionRepository.find.mockResolvedValue([{ code: 'users.create' }]);

      await expect(service.userHasAllPermissions('master', ['company.manage'])).resolves.toBe(true);
    });

    it('usuario sin rol usa solo overrides ALLOW', async () => {
      userRepository.findOne.mockResolvedValue({
        id: 'u-1',
        isSuperAdmin: false,
        role: null,
      });
      rolePermissionRepository.find.mockResolvedValue([]);
      userPermissionOverrideRepository.find.mockResolvedValue([
        {
          effect: 'ALLOW' as PermissionEffect,
          permission: { code: 'catalog.read' },
        },
      ]);

      const result = await service.getEffectivePermissions('u-1');

      expect(result).toEqual(['catalog.read']);
    });

    it('DENY gana sobre permisos del rol', async () => {
      userRepository.findOne.mockResolvedValue({
        id: 'u-2',
        isSuperAdmin: false,
        role: { roleId: 'role-adviser' },
      });
      rolePermissionRepository.find.mockResolvedValue([
        { permission: { code: 'catalog.read' } },
        { permission: { code: 'payments.read' } },
      ]);
      userPermissionOverrideRepository.find.mockResolvedValue([
        {
          effect: 'DENY' as PermissionEffect,
          permission: { code: 'payments.read' },
        },
      ]);

      const result = await service.getEffectivePermissions('u-2');

      expect(result).toEqual(['catalog.read']);
    });
  });

  describe('upsertUserPermissionOverride', () => {
    it('delegado no puede otorgar fuera de su scope delegable', async () => {
      userRepository.findOne.mockImplementation(async ({ where }: { where: { id: string } }) => {
        if (where.id === 'actor-1') return { id: 'actor-1', isSuperAdmin: false };
        return { id: 'target-1', isSuperAdmin: false };
      });
      permissionRepository.findOne.mockResolvedValue({ id: 'perm-1', code: 'users.delete' });
      jest.spyOn(service as any, 'canGrantPermission').mockResolvedValue(false);

      await expect(
        service.upsertUserPermissionOverride({
          userId: 'target-1',
          permissionCode: 'users.delete',
          effect: 'ALLOW',
          createdBy: 'actor-1',
          reason: 'test',
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('superadmin si puede otorgar permiso sin restriccion de scope', async () => {
      userRepository.findOne.mockImplementation(async ({ where }: { where: { id: string } }) => {
        if (where.id === 'actor-master') return { id: 'actor-master', isSuperAdmin: true };
        return { id: 'target-2', isSuperAdmin: false };
      });
      permissionRepository.findOne.mockResolvedValue({ id: 'perm-2', code: 'users.delete' });
      userPermissionOverrideRepository.findOne.mockResolvedValue(null);
      userPermissionOverrideRepository.create.mockImplementation((value) => value);
      userPermissionOverrideRepository.save.mockImplementation(async (value) => value);

      const result = await service.upsertUserPermissionOverride({
        userId: 'target-2',
        permissionCode: 'users.delete',
        effect: 'DENY',
        createdBy: 'actor-master',
        reason: 'policy',
      });

      expect(result).toMatchObject({
        userId: 'target-2',
        permissionId: 'perm-2',
        effect: 'DENY',
        reason: 'policy',
      });
      expect(userPermissionOverrideRepository.save).toHaveBeenCalled();
    });
  });
});
