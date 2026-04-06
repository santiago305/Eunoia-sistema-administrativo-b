import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { USER_READ_REPOSITORY, UserReadRepository } from 'src/modules/users/application/ports/user-read.repository';
import { RoleType } from 'src/shared/constantes/constants';
import { successResponse } from 'src/shared/response-standard/response';
import { UserForbiddenApplicationError } from '../errors/user-forbidden.error';
import { UserNotFoundApplicationError } from '../errors/user-not-found.error';

@Injectable()
export class GetUserByEmailUseCase {
  constructor(
    @Inject(USER_READ_REPOSITORY)
    private readonly userReadRepository: UserReadRepository,
  ) {}

  async execute(email: string, requesterRole: RoleType) {
    const user = await this.userReadRepository.findManagementByEmail(email);
    if (!user) {
      throw new NotFoundException(new UserNotFoundApplicationError().message);
    }

    this.assertCanViewRole(requesterRole, user.roleDescription);

    return successResponse('Usuario encontrado', {
      id: user.id,
      email: user.email,
      rol: user.roleDescription,
      deleted: user.deleted,
    });
  }

  private assertCanViewRole(requesterRole: RoleType, targetRole: string) {
    if (requesterRole === RoleType.ADMIN && targetRole === RoleType.ADMIN) {
      throw new ForbiddenException(new UserForbiddenApplicationError().message);
    }

    if (requesterRole === RoleType.MODERATOR && targetRole !== RoleType.ADVISER) {
      throw new ForbiddenException(new UserForbiddenApplicationError().message);
    }
  }
}
