import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
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
    if (requesterRole === RoleType.MODERATOR) {
      const target = await this.userReadRepository.findPublicById(id);
      if (!target) throw new UnauthorizedException('Usuario no encontrado');
      if (target.role.description !== RoleType.ADVISER) {
        throw new UnauthorizedException('No puedes eliminar usuarios administrativos');
      }
    }

    const isActive = await this.userRepository.existsByIdAndDeleted(id, false);
    if (!isActive) {
      throw new UnauthorizedException('El usuario ingresado no existe');
    }

    try {
      await this.userRepository.updateDeleted(id, true);
      return successResponse('El usuario ha sido eliminado');
    } catch (error) {
      console.error('[DeleteUserUseCase] error de la accion', error);
      throw new UnauthorizedException('no se pudo eliminar al usuario');
    }
  }
}
