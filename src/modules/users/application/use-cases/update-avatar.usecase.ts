import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { USER_REPOSITORY, UserRepository } from 'src/modules/users/application/ports/user.repository';
import { successResponse } from 'src/shared/response-standard/response';

@Injectable()
export class UpdateAvatarUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
  ) {}

  async execute(id: string, filePath: string, requesterUserId?: string) {
    if (requesterUserId && id !== requesterUserId) {
      throw new UnauthorizedException('No puedes subir avatar de otro usuario');
    }
    try {
      const domainUser = await this.userRepository.findById(id);
      if (!domainUser) throw new UnauthorizedException('Usuario no encontrado');

      domainUser.avatarUrl = filePath;
      const saved = await this.userRepository.save(domainUser);

      return successResponse('Avatar actualizado correctamente', {
        id: saved.id,
        name: saved.name,
        email: saved.email.value,
        avatarUrl: saved.avatarUrl,
      });
    } catch (error) {
      console.error('[UpdateAvatarUseCase] Error al subir avatar:', error);
      throw new UnauthorizedException('No se pudo actualizar el avatar');
    }
  }
}
