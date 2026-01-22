import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { UpdateUserDto } from 'src/modules/users/adapters/in/dtos/update-user.dto';
import { USER_REPOSITORY, UserRepository } from 'src/modules/users/application/ports/user.repository';
import { USER_READ_REPOSITORY, UserReadRepository } from 'src/modules/users/application/ports/user-read.repository';
import { Email } from 'src/modules/users/domain';
import { successResponse } from 'src/shared/response-standard/response';

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
      throw new UnauthorizedException('No puedes editar otro usuario');
    }

    const isActive = await this.userRepository.existsByIdAndDeleted(id, false);
    if (!isActive) {
      throw new UnauthorizedException('El usuario ingresado no existe');
    }

    const existingUser = await this.userRepository.findById(id);
    if (!existingUser) throw new UnauthorizedException('Usuario no encontrado');

    if (dto.email) {
      const normalizedEmail = dto.email;
      if (normalizedEmail !== existingUser.email.value) {
        const exists = await this.userRepository.existsByEmail(new Email(normalizedEmail));
        if (exists) {
          throw new UnauthorizedException('Este email ya estA registrado');
        }
        existingUser.email = new Email(normalizedEmail);
      }
    }
    if (dto.roleId) {
      throw new UnauthorizedException('No puedes cambiar el rol');
    }

    if (dto.name) existingUser.name = dto.name;
    if (dto.password) {
      throw new UnauthorizedException('No puedes cambiar la contrasena aqui');
    }
    if (dto.avatarUrl) {
      existingUser.avatarUrl = dto.avatarUrl;
    }

    try {
      await this.userRepository.save(existingUser);

      const updatedUser = await this.userReadRepository.findPublicById(id);
      return successResponse('Modificacion terminada', updatedUser);
    } catch (error) {
      console.error('[UpdateUserUseCase] error al editar el usuario: ', error);
      throw new UnauthorizedException('No pudimos modificar el usuario');
    }
  }
}
