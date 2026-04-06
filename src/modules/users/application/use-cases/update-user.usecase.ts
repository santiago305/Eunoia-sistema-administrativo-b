import { BadRequestException, ForbiddenException, Inject, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { UpdateUserDto } from 'src/modules/users/adapters/in/dtos/update-user.dto';
import { USER_REPOSITORY, UserRepository } from 'src/modules/users/application/ports/user.repository';
import { USER_READ_REPOSITORY, UserReadRepository } from 'src/modules/users/application/ports/user-read.repository';
import { successResponse } from 'src/shared/response-standard/response';
import { UserForbiddenApplicationError } from '../errors/user-forbidden.error';
import { UserNotFoundApplicationError } from '../errors/user-not-found.error';

@Injectable()
export class UpdateUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    @Inject(USER_READ_REPOSITORY)
    private readonly userReadRepository: UserReadRepository,
  ) {}

  async execute(id: string, dto: UpdateUserDto, requesterUserId: string) {
    if (id !== requesterUserId) {
      throw new ForbiddenException(new UserForbiddenApplicationError('No puedes editar otro usuario').message);
    }

    const isActive = await this.userRepository.existsByIdAndDeleted(id, false);
    if (!isActive) {
      throw new NotFoundException(new UserNotFoundApplicationError().message);
    }

    const existingUser = await this.userRepository.findById(id);
    if (!existingUser) throw new NotFoundException(new UserNotFoundApplicationError().message);

    if (dto.email) {
      throw new BadRequestException('No puedes cambiar el email');
    }
    if (dto.roleId) {
      throw new BadRequestException('No puedes cambiar el rol');
    }

    if (dto.name) existingUser.name = dto.name;
    if (dto.telefono !== undefined) {
      existingUser.telefono = dto.telefono;
    }
    if (dto.password) {
      throw new BadRequestException('No puedes cambiar la contrasena aqui');
    }
    if (dto.avatarUrl) {
      throw new BadRequestException('No puedes cambiar el avatar por este endpoint');
    }

    try {
      await this.userRepository.save(existingUser);

      const updatedUser = await this.userReadRepository.findPublicById(id);
      return successResponse('Modificacion terminada', updatedUser);
    } catch {
      throw new InternalServerErrorException('No pudimos modificar el usuario');
    }
  }
}
