import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { USER_REPOSITORY, UserRepository } from 'src/modules/users/application/ports/user.repository';
import { USER_READ_REPOSITORY, UserReadRepository } from 'src/modules/users/application/ports/user-read.repository';
import { RoleType } from 'src/shared/constantes/constants';
import { successResponse } from 'src/shared/response-standard/response';

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
      throw new UnauthorizedException('No autorizado para restaurar usuarios');
    }

    const target = await this.userReadRepository.findManagementById(id);
    if (!target) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    if (target.role.description === RoleType.ADMIN) {
      throw new UnauthorizedException('No puedes restaurar usuarios administradores');
    }

    if (requesterRole === RoleType.MODERATOR && target.role.description !== RoleType.ADVISER) {
      throw new UnauthorizedException('No estas autorizado para restaurar usuario');
    }

    const isDeleted = await this.userRepository.existsByIdAndDeleted(id, true);
    if (!isDeleted) {
      throw new UnauthorizedException('Este usuario todavia no ha sido eliminado');
    }

    try {
      await this.userRepository.updateDeleted(id, false);
      return successResponse('El usuario ha sido restaurado');
    } catch (error) {
      console.error('[RestoreUserUseCase] error de la accion', error);
      throw new UnauthorizedException('No se pudo restaurar al usuario');
    }
  }
}
