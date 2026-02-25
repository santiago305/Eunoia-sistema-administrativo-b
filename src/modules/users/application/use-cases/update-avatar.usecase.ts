import {
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException
} from '@nestjs/common';
import { USER_REPOSITORY, UserRepository } from 'src/modules/users/application/ports/user.repository';
import { successResponse } from 'src/shared/response-standard/response';

@Injectable()
export class UpdateAvatarUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
  ) {}

  async execute(id: string, filePath: string) {
    try {
      const domainUser = await this.userRepository.findById(id);
      if (!domainUser) throw new NotFoundException('Usuario no encontrado');

      domainUser.avatarUrl = filePath;
      const saved = await this.userRepository.save(domainUser);

      return successResponse('Avatar actualizado correctamente', {
        id: saved.id,
        name: saved.name,
        email: saved.email.value,
        avatarUrl: saved.avatarUrl,
      });
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof UnauthorizedException) {
        throw error;
      }
      console.error('[UpdateAvatarUseCase] Error al subir avatar:', error);
      throw new InternalServerErrorException('No se pudo actualizar el avatar');
    }
  }
}
