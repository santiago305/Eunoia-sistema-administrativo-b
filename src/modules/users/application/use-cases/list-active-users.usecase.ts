import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { USER_READ_REPOSITORY, UserReadRepository } from 'src/modules/users/application/ports/user-read.repository';
import { RoleType } from 'src/shared/constantes/constants';

@Injectable()
export class ListActiveUsersUseCase {
  constructor(
    @Inject(USER_READ_REPOSITORY)
    private readonly userReadRepository: UserReadRepository,
  ) {}

  async execute(
    params: {
      page?: number;
      filters?: { role?: string };
      sortBy?: string;
      order?: 'ASC' | 'DESC';
    },
    requesterRole: RoleType
  ) {
    this.assertCanListUsers(requesterRole);
    const scopedParams = this.applyRoleScope(params, requesterRole);
    return this.userReadRepository.listUsers({
      page: scopedParams.page,
      filters: scopedParams.filters,
      sortBy: scopedParams.sortBy,
      order: scopedParams.order,
      whereClause: 'role.deleted = false',
    });
  }

  private assertCanListUsers(requesterRole: RoleType) {
    if (requesterRole !== RoleType.ADMIN && requesterRole !== RoleType.MODERATOR) {
      throw new UnauthorizedException('No autorizado para listar usuarios');
    }
  }

  private applyRoleScope(
    params: {
      page?: number;
      filters?: { role?: string };
      sortBy?: string;
      order?: 'ASC' | 'DESC';
    },
    requesterRole: RoleType,
  ) {
    if (requesterRole === RoleType.MODERATOR) {
      return { ...params, filters: { ...(params.filters || {}), role: RoleType.ADVISER } };
    }

    return params;
  }
}
