import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { USER_READ_REPOSITORY, UserReadRepository } from 'src/modules/users/application/ports/user-read.repository';
import { RoleType } from 'src/shared/constantes/constants';
import { successResponse } from 'src/shared/response-standard/response';
import { UserNotFoundApplicationError } from '../errors/user-not-found.error';

@Injectable()
export class GetUserUseCase {
  constructor(
    @Inject(USER_READ_REPOSITORY)
    private readonly userReadRepository: UserReadRepository,
  ) {}

  async execute(id: string, _requesterRole: RoleType) {
    const user = await this.userReadRepository.findManagementById(id);
    if (!user) {
      throw new NotFoundException(new UserNotFoundApplicationError().message);
    }

    return successResponse('Usuario encontrado', {
      id: user.id,
      name: user.name,
      email: user.email,
      telefono: user.telefono,
      avatarUrl: user.avatarUrl,
      rol: user.role.description,
      deleted: user.deleted,
    });
  }
}
