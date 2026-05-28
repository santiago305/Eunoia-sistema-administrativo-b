import { Inject, Injectable } from '@nestjs/common';
import {
  USER_READ_REPOSITORY,
  UserListStatus,
  UserReadRepository
} from 'src/modules/users/application/ports/user-read.repository';
import { RoleType } from 'src/shared/constantes/constants';

@Injectable()
export class ListUsersUseCase {
  constructor(
    @Inject(USER_READ_REPOSITORY)
    private readonly userReadRepository: UserReadRepository,
  ) {}

  async execute(
    params: {
      page?: number;
      filters?: {
        role?: string;
        q?: string;
        allowedRoles?: string[];
        allowedUserIds?: string[];
      };
      sortBy?: string;
      order?: 'ASC' | 'DESC';
      status?: UserListStatus;
    },
    requester: { role?: RoleType | null; userId: string }
  ) {
    const requesterScope = await this.userReadRepository.findManagementScopeById(requester.userId);
    const scopedParams = this.applyRoleScope(params, requester.role, requesterScope);
    const result = await this.userReadRepository.listUsers({
      page: scopedParams.page,
      filters: scopedParams.filters,
      sortBy: scopedParams.sortBy,
      order: scopedParams.order,
      status: scopedParams.status ?? 'all',
    });

    const items = result.items.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      telefono: user.telefono,
      rol: user.rol,
      roleId: user.roleId,
      deleted: user.deleted,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      createdByUserId: user.createdByUserId ?? null,
      createdByUserName: user.createdByUserName ?? null,
      manageableRoleDescriptions: user.manageableRoleDescriptions ?? null,
      manageableUserIds: user.manageableUserIds ?? null,
    }));
    const totalPages = result.total === 0 ? 0 : Math.ceil(result.total / result.pageSize);

    return {
      items,
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      totalPages,
      hasPrev: result.page > 1,
      hasNext: result.page < totalPages,
    };
  }

  private applyRoleScope(
    params: {
      page?: number;
      filters?: {
        role?: string;
        q?: string;
        allowedRoles?: string[];
        allowedUserIds?: string[];
      };
      sortBy?: string;
      order?: 'ASC' | 'DESC';
      status?: UserListStatus;
    },
    requesterRole: RoleType | null | undefined,
    requesterScope?: {
      id: string;
      roleDescription: string | null;
      isSuperAdmin: boolean;
      manageableRoleDescriptions: string[] | null;
      manageableUserIds: string[] | null;
    } | null,
  ) {
    if (requesterScope?.isSuperAdmin) {
      return params;
    }

    const configuredAllowedRoles = Array.isArray(requesterScope?.manageableRoleDescriptions)
      ? requesterScope?.manageableRoleDescriptions.filter((value) => value && value.trim().length > 0)
      : [];
    const configuredAllowedUserIds = Array.isArray(requesterScope?.manageableUserIds)
      ? requesterScope?.manageableUserIds.filter((value) => value && value.trim().length > 0)
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
      },
    };
  }
}
