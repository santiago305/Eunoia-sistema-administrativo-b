import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import {
  USER_READ_REPOSITORY,
  UserListStatus,
  UserReadRepository
} from 'src/modules/users/application/ports/user-read.repository';
import { RoleType } from 'src/shared/constantes/constants';
import { UserForbiddenApplicationError } from '../errors/user-forbidden.error';

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
      };
      sortBy?: string;
      order?: 'ASC' | 'DESC';
      status?: UserListStatus;
    },
    requesterRole: RoleType
  ) {
    this.assertCanListUsers(requesterRole);
    const scopedParams = this.applyRoleScope(params, requesterRole);
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

  private assertCanListUsers(requesterRole: RoleType) {
    if (requesterRole !== RoleType.ADMIN && requesterRole !== RoleType.MODERATOR) {
      throw new ForbiddenException(new UserForbiddenApplicationError('No autorizado para listar usuarios').message);
    }
  }

  private applyRoleScope(
    params: {
      page?: number;
      filters?: {
        role?: string;
        q?: string;
        allowedRoles?: string[];
      };
      sortBy?: string;
      order?: 'ASC' | 'DESC';
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

    if (requesterRole === RoleType.ADMIN) {
      const requestedRole = params.filters?.role;
      const allowedForAdmin = [RoleType.MODERATOR, RoleType.ADVISER];

      return {
        ...params,
        filters: {
          ...(params.filters || {}),
          role: requestedRole === RoleType.ADMIN ? '__none__' : requestedRole,
          allowedRoles: allowedForAdmin,
        },
      };
    }

    return params;
  }
}
