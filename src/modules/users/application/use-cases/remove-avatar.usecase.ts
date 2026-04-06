import {
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException
} from '@nestjs/common';
import { FILE_STORAGE, FileStorage } from 'src/shared/application/ports/file-storage.port';
import { InvalidFileStoragePathError } from 'src/shared/application/errors/file-storage.errors';
import { USER_REPOSITORY, UserRepository } from 'src/modules/users/application/ports/user.repository';
import { successResponse } from 'src/shared/response-standard/response';
import { UserNotFoundApplicationError } from '../errors/user-not-found.error';

@Injectable()
export class RemoveAvatarUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    @Inject(FILE_STORAGE)
    private readonly fileStorage: FileStorage,
  ) {}

  async execute(id: string) {
    try {
      const domainUser = await this.userRepository.findById(id);
      if (!domainUser) throw new NotFoundException(new UserNotFoundApplicationError().message);

      const previousAvatarUrl = domainUser.avatarUrl;

      domainUser.avatarUrl = "";
      const saved = await this.userRepository.save(domainUser);

      if (this.shouldDeleteLocalAvatar(previousAvatarUrl)) {
        try {
          await this.fileStorage.delete(previousAvatarUrl!);
        } catch (err) {
          if (err instanceof InvalidFileStoragePathError) {
            throw err;
          }
        }
      }

      return successResponse('Avatar actualizado correctamente', {
        id: saved.id,
        avatarUrl: saved.avatarUrl,
      });
    } catch (err) {
      if (err instanceof NotFoundException || err instanceof InvalidFileStoragePathError) {
        throw err;
      }
      throw new InternalServerErrorException('No se pudo actualizar el avatar');
    }
  }

  private shouldDeleteLocalAvatar(avatarUrl?: string) {
    if (!avatarUrl) return false;
    return avatarUrl.startsWith('/api/assets/') || avatarUrl.startsWith('/assets/');
  }
}
