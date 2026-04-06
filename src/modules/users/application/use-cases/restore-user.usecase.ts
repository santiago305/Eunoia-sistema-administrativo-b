import { ForbiddenException, Inject, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { USER_REPOSITORY, UserRepository } from 'src/modules/users/application/ports/user.repository';
import { USER_READ_REPOSITORY, UserReadRepository } from 'src/modules/users/application/ports/user-read.repository';
import { RoleType } from 'src/shared/constantes/constants';
import { successResponse } from 'src/shared/response-standard/response';
import { UserForbiddenApplicationError } from '../errors/user-forbidden.error';
import { UserNotFoundApplicationError } from '../errors/user-not-found.error';

@Injectable()
export class RestoreUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    @Inject(USER_READ_REPOSITORY)
    private readonly userReadRepository: UserReadRepository,
  ) {}

  async execute(id: string, requesterRole: RoleType) {
    if (requesterRole !== RoleType.ADMIN && requesterRole !== RoleType.MODERATOR) {
      throw new ForbiddenException(new UserForbiddenApplicationError('No autorizado para restaurar usuarios').message);
    }

    const target = await this.userReadRepository.findManagementById(id);
    if (!target) {
      throw new NotFoundException(new UserNotFoundApplicationError().message);
    }

    if (target.role.description === RoleType.ADMIN) {
      throw new ForbiddenException(new UserForbiddenApplicationError('No puedes restaurar usuarios administradores').message);
    }

    if (requesterRole === RoleType.MODERATOR && target.role.description !== RoleType.ADVISER) {
      throw new ForbiddenException(new UserForbiddenApplicationError('No estas autorizado para restaurar usuario').message);
    }

    const isDeleted = await this.userRepository.existsByIdAndDeleted(id, true);
    if (!isDeleted) {
      throw new NotFoundException('Este usuario todavia no ha sido eliminado');
    }

    try {
      await this.userRepository.updateDeleted(id, false);
      return successResponse('El usuario ha sido restaurado');
    } catch {
      throw new InternalServerErrorException('No se pudo restaurar al usuario');
    }
  }
}
