import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { USER_REPOSITORY, UserRepository } from 'src/modules/users/application/ports/user.repository';
import { successResponse } from 'src/shared/response-standard/response';

@Injectable()
export class RestoreUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
  ) {}

  async execute(id: string) {
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
