import { Inject, Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { USER_READ_REPOSITORY, UserReadRepository } from 'src/modules/users/application/ports/user-read.repository';
import { USER_REPOSITORY, UserRepository } from 'src/modules/users/application/ports/user.repository';
import { RoleType } from 'src/shared/constantes/constants';
import { successResponse } from 'src/shared/response-standard/response';

@Injectable()
export class DeleteUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    @Inject(USER_READ_REPOSITORY)
    private readonly userReadRepository: UserReadRepository,
  ) {}

  async execute(id: string, requesterRole: RoleType) {
    if (requesterRole !== RoleType.ADMIN && requesterRole !== RoleType.MODERATOR) {
      throw new ForbiddenException('No autorizado para eliminar usuarios');
    }

    const target = await this.userReadRepository.findPublicById(id);
    if (!target) throw new ForbiddenException('Usuario no encontrado');

    if (target.role.description === RoleType.ADMIN) {
      throw new ForbiddenException('No puedes eliminar usuarios administradores');
    }

    if (requesterRole === RoleType.MODERATOR && target.role.description !== RoleType.ADVISER) {
      throw new ForbiddenException('No puedes eliminar usuarios administrativos');
    }

    const isActive = await this.userRepository.existsByIdAndDeleted(id, false);
    if (!isActive) {
      throw new ForbiddenException('El usuario ingresado no existe');
    }

    try {
      await this.userRepository.updateDeleted(id, true);
      return successResponse('El usuario ha sido eliminado');
    } catch (error) {
      console.error('[DeleteUserUseCase] error de la accion', error);
      throw new ForbiddenException('no se pudo eliminar al usuario');
    }
  }
}
