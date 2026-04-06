import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { USER_REPOSITORY, UserRepository } from 'src/modules/users/application/ports/user.repository';
import { Password } from 'src/modules/users/domain';
import { successResponse } from 'src/shared/response-standard/response';
import { UserForbiddenApplicationError } from '../errors/user-forbidden.error';
import { UserNotFoundApplicationError } from '../errors/user-not-found.error';


@Injectable()
export class ChangePasswordUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
  ) {}

  async execute(
    id: string,
    currentPassword: string,
    newPassword: string,
    requesterUserId: string
  ) {
    if (id !== requesterUserId) {
      throw new ForbiddenException(new UserForbiddenApplicationError('No puedes cambiar la contrasena de otro usuario').message);
    }
    if (!newPassword || !newPassword.trim()) {
      throw new BadRequestException('La nueva contrasena es obligatoria');
    }
    const domainUser = await this.userRepository.findById(id);
    if (!domainUser) throw new NotFoundException(new UserNotFoundApplicationError().message);

    const isMatch = await argon2.verify(
      domainUser.password.value,
      currentPassword
    );
    if (!isMatch) throw new UnauthorizedException('Contrasena actual incorrecta');

    const hashedPassword = await argon2.hash(newPassword, {
      type: argon2.argon2id,
    });
    domainUser.password = new Password(hashedPassword);
    await this.userRepository.save(domainUser);
    
    return successResponse('Contrasena actualizada correctamente');
  }
}
