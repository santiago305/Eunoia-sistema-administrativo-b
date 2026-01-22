import { Inject, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { USER_READ_REPOSITORY, UserReadRepository } from 'src/modules/users/application/ports/user-read.repository';
import { RoleType } from 'src/shared/constantes/constants';
import { successResponse } from 'src/shared/response-standard/response';

@Injectable()
export class GetUserByEmailUseCase {
  constructor(
    @Inject(USER_READ_REPOSITORY)
    private readonly userReadRepository: UserReadRepository,
  ) {}

  async execute(email: string, requesterRole: RoleType) {
    const user = await this.userReadRepository.findPublicByEmail(email);
    if (!user) {
      throw new NotFoundException('No hemos encontrado el usuario');
    }

    this.assertCanViewRole(requesterRole, user.roleDescription);

    return successResponse('Usuario encontrado', {
      id: user.id,
      email: user.email,
      rol: user.roleDescription,
    });
  }

  private assertCanViewRole(requesterRole: RoleType, targetRole: string) {
    if (requesterRole === RoleType.MODERATOR && targetRole !== RoleType.ADVISER) {
      throw new UnauthorizedException('Acceso denegado');
    }
  }
}
