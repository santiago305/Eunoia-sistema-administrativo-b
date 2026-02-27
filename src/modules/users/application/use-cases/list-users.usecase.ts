import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
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
      };
      sortBy?: string;
      order?: 'ASC' | 'DESC';
      status?: UserListStatus;
    },
    requesterRole: RoleType
  ) {
    this.assertCanListUsers(requesterRole);
    const scopedParams = this.applyRoleScope(params, requesterRole);
    const users = await this.userReadRepository.listUsers({
      page: scopedParams.page,
      filters: scopedParams.filters,
      sortBy: scopedParams.sortBy,
      order: scopedParams.order,
      status: scopedParams.status ?? 'all',
    });

    return users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      telefono: user.telefono,
      rol: user.rol,
      roleId: user.roleId,
      deleted: user.deleted,
      createdAt: user.createdAt,
    }));
  }

  private assertCanListUsers(requesterRole: RoleType) {
    if (requesterRole !== RoleType.ADMIN && requesterRole !== RoleType.MODERATOR) {
      throw new UnauthorizedException('No autorizado para listar usuarios');
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
