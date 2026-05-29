import { Inject, Injectable } from '@nestjs/common';
import {
  ROLE_READ_REPOSITORY,
  RoleListStatus,
  RoleReadRepository,
} from '../ports/role-read.repository';
import { USER_READ_REPOSITORY, UserReadRepository } from 'src/modules/users/application/ports/user-read.repository';
import { RoleType } from 'src/shared/constantes/constants';
import { resolveAllowedRoleDescriptions } from '../support/role-scope.util';

@Injectable()
export class ListRolesUseCase {
  constructor(
    @Inject(ROLE_READ_REPOSITORY)
    private readonly roleReadRepository: RoleReadRepository,
    @Inject(USER_READ_REPOSITORY)
    private readonly userReadRepository: UserReadRepository,
  ) {}

  async execute(
    params?: { status?: RoleListStatus },
    requester?: { userId: string; role?: RoleType | null },
  ) {
    const roles = await this.roleReadRepository.listRoles({ status: params?.status ?? 'all' });
    if (!requester?.userId) return [];

    const requesterScope = await this.userReadRepository.findManagementScopeById(requester.userId);
    if (requesterScope?.isSuperAdmin) {
      return roles;
    }

    const allowedRoles = resolveAllowedRoleDescriptions({
      requesterRole: requester.role,
      scope: requesterScope
        ? {
            roleDescription: requesterScope.roleDescription,
            manageableRoleDescriptions: requesterScope.manageableRoleDescriptions,
          }
        : null,
    });

    return roles.filter(
      (role) => allowedRoles.includes(role.description) || role.createdByUserId === requester.userId,
    );
  }
}
