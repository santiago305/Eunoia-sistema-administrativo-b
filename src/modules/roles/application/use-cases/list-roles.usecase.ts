import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import {
  ROLE_READ_REPOSITORY,
  RoleListStatus,
  RoleReadRepository,
} from '../ports/role-read.repository';
import { RoleType } from 'src/shared/constantes/constants';
import { RoleForbiddenApplicationError } from '../errors/role-forbidden.error';

@Injectable()
export class ListRolesUseCase {
  constructor(
    @Inject(ROLE_READ_REPOSITORY)
    private readonly roleReadRepository: RoleReadRepository,
  ) {}

  async execute(params?: { status?: RoleListStatus }, requesterRole?: RoleType) {
    this.assertCanListRoles(requesterRole);
    const roles = await this.roleReadRepository.listRoles({ status: params?.status ?? 'all' });

    if (requesterRole === RoleType.MODERATOR) {
      return roles.filter((role) => role.description === RoleType.ADVISER);
    }

    return roles;
  }

  private assertCanListRoles(requesterRole?: RoleType) {
    if (requesterRole !== RoleType.ADMIN && requesterRole !== RoleType.MODERATOR) {
      throw new ForbiddenException(new RoleForbiddenApplicationError('No autorizado para listar roles').message);
    }
  }
}
