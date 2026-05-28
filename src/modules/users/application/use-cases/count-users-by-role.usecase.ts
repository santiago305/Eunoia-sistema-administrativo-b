import { Inject, Injectable } from '@nestjs/common';
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
    requester: { role?: RoleType | null; userId: string },
  ) {
    const requesterScope = await this.userReadRepository.findManagementScopeById(requester.userId);
    const scopedParams = this.applyRoleScope(params, requester.role, requester.userId, requesterScope);
    const summary = await this.userReadRepository.countUsersByRole({
      filters: scopedParams.filters,
      status: scopedParams.status ?? 'all',
    });

    if (requesterScope?.isSuperAdmin) {
      return {
        total: summary.total,
        byRole: summary.byRole,
      };
    }

    return {
      total: summary.total,
      byRole: summary.byRole,
    };
  }

  private applyRoleScope(
    params: {
      filters?: {
        role?: string;
        q?: string;
      };
      status?: UserListStatus;
    },
    requesterRole: RoleType | null | undefined,
    requesterUserId: string,
    requesterScope?: {
      id: string;
      roleDescription: string | null;
      isSuperAdmin: boolean;
      manageableRoleDescriptions: string[] | null;
      manageableUserIds: string[] | null;
    } | null,
  ) {
    if (requesterScope?.isSuperAdmin) {
      return {
        ...params,
        filters: {
          ...(params.filters || {}),
          excludeSuperAdmins: true,
          includeUserIdWhenExcludingSuperAdmins: requesterUserId,
        },
      };
    }

    const configuredAllowedRoles = Array.isArray(requesterScope?.manageableRoleDescriptions)
      ? requesterScope.manageableRoleDescriptions.filter((value) => value && value.trim().length > 0)
      : [];
    const configuredAllowedUserIds = Array.isArray(requesterScope?.manageableUserIds)
      ? requesterScope.manageableUserIds.filter((value) => value && value.trim().length > 0)
      : [];

    if (configuredAllowedRoles.length > 0 || configuredAllowedUserIds.length > 0) {
      const requestedRole = params.filters?.role;
      const normalizedRequestedRole =
        requestedRole && configuredAllowedRoles.length > 0 && !configuredAllowedRoles.includes(requestedRole)
          ? '__none__'
          : requestedRole;

      return {
        ...params,
        filters: {
          ...(params.filters || {}),
          role: normalizedRequestedRole,
          allowedRoles: configuredAllowedRoles.length > 0 ? configuredAllowedRoles : undefined,
          allowedUserIds: configuredAllowedUserIds.length > 0 ? configuredAllowedUserIds : undefined,
          excludeSuperAdmins: true,
        },
      };
    }

    const fallbackAllowedRoles = requesterScope?.roleDescription
      ? [requesterScope.roleDescription]
      : requesterRole
        ? [requesterRole]
        : [];
    return {
      ...params,
      filters: {
        ...(params.filters || {}),
        allowedRoles: fallbackAllowedRoles.length > 0 ? fallbackAllowedRoles : undefined,
        excludeSuperAdmins: true,
      },
    };
  }
}
