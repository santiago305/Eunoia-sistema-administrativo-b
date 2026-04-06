import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ROLE_READ_REPOSITORY, RoleReadRepository } from 'src/modules/roles/application/ports/role-read.repository';
import { USER_READ_REPOSITORY, UserReadRepository } from 'src/modules/users/application/ports/user-read.repository';
import { USER_REPOSITORY, UserRepository } from 'src/modules/users/application/ports/user.repository';
import { RoleId } from 'src/modules/users/domain';
import { RoleType } from 'src/shared/constantes/constants';
import { successResponse } from 'src/shared/response-standard/response';
import { UserForbiddenApplicationError } from '../errors/user-forbidden.error';
import { UserNotFoundApplicationError } from '../errors/user-not-found.error';

@Injectable()
export class UpdateUserRoleUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    @Inject(USER_READ_REPOSITORY)
    private readonly userReadRepository: UserReadRepository,
    @Inject(ROLE_READ_REPOSITORY)
    private readonly roleReadRepository: RoleReadRepository,
  ) {}

  async execute(id: string, roleId: string, requesterRole: RoleType) {
    if (requesterRole !== RoleType.ADMIN) {
      throw new ForbiddenException(new UserForbiddenApplicationError('No autorizado para cambiar roles de usuario').message);
    }

    const target = await this.userReadRepository.findManagementById(id);
    if (!target) {
      throw new NotFoundException(new UserNotFoundApplicationError().message);
    }

    if (target.role.description === RoleType.ADMIN) {
      throw new ForbiddenException(new UserForbiddenApplicationError('No puedes cambiar el rol de un administrador').message);
    }

    const nextRole = await this.roleReadRepository.findById(roleId);
    if (!nextRole || nextRole.deleted) {
      throw new NotFoundException('Rol invalido');
    }

    if (nextRole.description === RoleType.ADMIN) {
      throw new ForbiddenException(new UserForbiddenApplicationError('No puedes asignar rol administrador').message);
    }

    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundException(new UserNotFoundApplicationError().message);
    }

    user.roleId = new RoleId(nextRole.id);
    await this.userRepository.save(user);

    const updated = await this.userReadRepository.findManagementById(id);
    return successResponse('Rol actualizado correctamente', {
      id: updated?.id ?? id,
      rol: updated?.role.description ?? nextRole.description,
      roleId: updated?.role.id ?? nextRole.id,
    });
  }
}

