import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ROLE_READ_REPOSITORY, RoleReadRepository } from 'src/modules/roles/application/ports/role-read.repository';
import { USER_READ_REPOSITORY, UserReadRepository } from 'src/modules/users/application/ports/user-read.repository';
import { USER_REPOSITORY, UserRepository } from 'src/modules/users/application/ports/user.repository';
import { successResponse } from 'src/shared/response-standard/response';
import { UserForbiddenApplicationError } from '../errors/user-forbidden.error';
import { UserNotFoundApplicationError } from '../errors/user-not-found.error';

@Injectable()
export class UpdateUserManagementScopeUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    @Inject(USER_READ_REPOSITORY)
    private readonly userReadRepository: UserReadRepository,
    @Inject(ROLE_READ_REPOSITORY)
    private readonly roleReadRepository: RoleReadRepository,
  ) {}

  async execute(
    userId: string,
    params: {
      manageableRoleDescriptions?: string[];
      manageableUserIds?: string[];
    },
    requesterUserId: string,
  ) {
    const requester = await this.userReadRepository.findManagementScopeById(requesterUserId);
    if (!requester?.isSuperAdmin) {
      throw new ForbiddenException(new UserForbiddenApplicationError('Solo superadministrador').message);
    }

    const targetUser = await this.userReadRepository.findManagementById(userId);
    if (!targetUser) {
      throw new NotFoundException(new UserNotFoundApplicationError('Usuario no encontrado').message);
    }

    const manageableRoleDescriptions = Array.isArray(params.manageableRoleDescriptions)
      ? [...new Set(params.manageableRoleDescriptions.map((value) => value.trim().toLowerCase()).filter(Boolean))]
      : null;
    const manageableUserIds = Array.isArray(params.manageableUserIds)
      ? [...new Set(params.manageableUserIds.filter((value) => value && value !== userId))]
      : null;

    if (manageableRoleDescriptions?.length) {
      for (const roleDescription of manageableRoleDescriptions) {
        const role = await this.roleReadRepository.findByDescription(roleDescription);
        if (!role || role.deleted) {
          throw new BadRequestException(`Rol inválido en alcance de gestión: ${roleDescription}`);
        }
      }
    }

    if (manageableUserIds?.length) {
      for (const manageableUserId of manageableUserIds) {
        const user = await this.userReadRepository.findManagementById(manageableUserId);
        if (!user) {
          throw new BadRequestException(`Usuario inválido en alcance de gestión: ${manageableUserId}`);
        }
      }
    }

    await this.userRepository.updateManagementScope(userId, {
      manageableRoleDescriptions,
      manageableUserIds,
    });

    return successResponse('Alcance de gestión actualizado');
  }
}
