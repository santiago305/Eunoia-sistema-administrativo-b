import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ROLE_REPOSITORY, RoleRepository } from '../ports/role.repository';
import { RoleNotFoundApplicationError } from '../errors/role-not-found.error';
import { USER_READ_REPOSITORY, UserReadRepository } from 'src/modules/users/application/ports/user-read.repository';
import { RoleType } from 'src/shared/constantes/constants';
import { assertCanManageRoleByScope } from '../support/role-scope.util';

@Injectable()
export class RestoreRoleUseCase {
  constructor(
    @Inject(ROLE_REPOSITORY)
    private readonly roleRepository: RoleRepository,
    @Inject(USER_READ_REPOSITORY)
    private readonly userReadRepository: UserReadRepository,
  ) {}

  async execute(id: string, requester?: { userId: string; role?: RoleType | null }) {
    const role = await this.roleRepository.findById(id);

    if (!role) {
      throw new NotFoundException(new RoleNotFoundApplicationError().message);
    }
    if (requester?.userId) {
      const requesterScope = await this.userReadRepository.findManagementScopeById(requester.userId);
      assertCanManageRoleByScope({
        requesterRole: requester.role,
        requesterUserId: requester.userId,
        targetRoleDescription: role.description,
        targetCreatedByUserId: role.createdByUserId ?? null,
        scope: requesterScope,
      });
    }
    if (!role.deleted) {
      throw new BadRequestException('El rol ya se encuentra activo');
    }
    await this.roleRepository.updateDeleted(id, false);

    return { message: 'Rol restaurado correctamente' };
  }
}
