import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import {
  USER_READ_REPOSITORY,
  UserListStatus,
  UserReadRepository,
} from 'src/modules/users/application/ports/user-read.repository';
import { RoleType } from 'src/shared/constantes/constants';

@Injectable()
export class CountUsersByRoleUseCase {
  constructor(
    @Inject(USER_READ_REPOSITORY)
    private readonly userReadRepository: UserReadRepository,
  ) {}

  async execute(
    params: {
      filters?: {
        role?: string;
        q?: string;
      };
      status?: UserListStatus;
    },
    requesterRole: RoleType,
  ) {
    this.assertCanCountUsers(requesterRole);
    const scopedParams = this.applyRoleScope(params, requesterRole);
    const summary = await this.userReadRepository.countUsersByRole({
      filters: scopedParams.filters,
      status: scopedParams.status ?? 'all',
    });

    if (requesterRole === RoleType.MODERATOR) {
      return {
        total: summary.byRole[RoleType.ADVISER] ?? 0,
        byRole: {
          [RoleType.ADVISER]: summary.byRole[RoleType.ADVISER] ?? 0,
        },
      };
    }

    return {
      total:
        (summary.byRole[RoleType.ADMIN] ?? 0) +
        (summary.byRole[RoleType.MODERATOR] ?? 0) +
        (summary.byRole[RoleType.ADVISER] ?? 0),
      byRole: {
        [RoleType.ADMIN]: summary.byRole[RoleType.ADMIN] ?? 0,
        [RoleType.MODERATOR]: summary.byRole[RoleType.MODERATOR] ?? 0,
        [RoleType.ADVISER]: summary.byRole[RoleType.ADVISER] ?? 0,
      },
    };
  }

  private assertCanCountUsers(requesterRole: RoleType) {
    if (requesterRole !== RoleType.ADMIN && requesterRole !== RoleType.MODERATOR) {
      throw new UnauthorizedException('No autorizado para consultar conteo de usuarios por rol');
    }
  }

  private applyRoleScope(
    params: {
      filters?: {
        role?: string;
        q?: string;
      };
      status?: UserListStatus;
    },
    requesterRole: RoleType,
  ) {
    if (requesterRole === RoleType.MODERATOR) {
      return {
        ...params,
        filters: {
          ...(params.filters || {}),
          role: RoleType.ADVISER,
          allowedRoles: [RoleType.ADVISER],
        },
      };
    }

    const requestedRole = params.filters?.role;
    const allowedRoles = [RoleType.ADMIN, RoleType.MODERATOR, RoleType.ADVISER];
    const normalizedRequestedRole =
      requestedRole && !allowedRoles.includes(requestedRole as RoleType) ? '__none__' : requestedRole;

    return {
      ...params,
      filters: {
        ...(params.filters || {}),
        role: normalizedRequestedRole,
        allowedRoles,
      },
    };
  }
}
