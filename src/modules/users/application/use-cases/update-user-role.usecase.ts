import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ROLE_READ_REPOSITORY, RoleReadRepository } from 'src/modules/roles/application/ports/role-read.repository';
import { USER_READ_REPOSITORY, UserReadRepository } from 'src/modules/users/application/ports/user-read.repository';
import { USER_REPOSITORY, UserRepository } from 'src/modules/users/application/ports/user.repository';
import { RoleId } from 'src/modules/users/domain';
import { MASTER_ROLE_DESCRIPTION, RoleType } from 'src/shared/constantes/constants';
import { successResponse } from 'src/shared/response-standard/response';
import { UserForbiddenApplicationError } from '../errors/user-forbidden.error';
import { UserNotFoundApplicationError } from '../errors/user-not-found.error';

@Injectable()
export class UpdateUserRoleUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    @Inject(USER_READ_REPOSITORY)
    private readonly userReadRepository: UserReadRepository,
    @Inject(ROLE_READ_REPOSITORY)
    private readonly roleReadRepository: RoleReadRepository,
  ) {}

  async execute(id: string, roleId: string, requester: { role: RoleType; userId: string }) {
    const requesterScope = await this.userReadRepository.findManagementScopeById(requester.userId);
    const isSuperAdmin = Boolean(requesterScope?.isSuperAdmin);

    const target = await this.userReadRepository.findManagementById(id);
    if (!target) {
      throw new NotFoundException(new UserNotFoundApplicationError().message);
    }
    if (target.isSuperAdmin) {
      throw new ForbiddenException(
        new UserForbiddenApplicationError('No autorizado para cambiar el rol de un super administrador').message,
      );
    }

    const nextRole = await this.roleReadRepository.findById(roleId);
    if (!nextRole || nextRole.deleted) {
      throw new NotFoundException('Rol invalido');
    }

    if (String(nextRole.description ?? '').trim().toLowerCase() === MASTER_ROLE_DESCRIPTION) {
      throw new ForbiddenException(
        new UserForbiddenApplicationError('No autorizado para asignar el rol maestro').message,
      );
    }

    if (!isSuperAdmin) {
      const allowedRoles = Array.isArray(requesterScope?.manageableRoleDescriptions)
        ? requesterScope.manageableRoleDescriptions.filter((value) => value && value.trim().length > 0)
        : requesterScope?.roleDescription
          ? [requesterScope.roleDescription]
          : requester.role
            ? [requester.role]
            : [];
      const allowedUserIds = Array.isArray(requesterScope?.manageableUserIds)
        ? requesterScope.manageableUserIds
        : [];

      const canManageTarget =
        allowedRoles.includes(target.role.description) || allowedUserIds.includes(target.id);
      const canAssignNextRole = allowedRoles.includes(nextRole.description);

      if (!canManageTarget || !canAssignNextRole) {
        throw new ForbiddenException(
          new UserForbiddenApplicationError('No autorizado para cambiar el rol de este usuario').message,
        );
      }
    }

    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundException(new UserNotFoundApplicationError().message);
    }

    user.roleId = new RoleId(nextRole.id);
    await this.userRepository.save(user);

    const updated = await this.userReadRepository.findManagementById(id);
    return successResponse('Rol actualizado correctamente', {
      id: updated?.id ?? id,
      rol: updated?.role.description ?? nextRole.description,
      roleId: updated?.role.id ?? nextRole.id,
    });
  }
}

