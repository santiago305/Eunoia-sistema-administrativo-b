import { Inject, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { USER_READ_REPOSITORY, UserReadRepository } from 'src/modules/users/application/ports/user-read.repository';
import { RoleType } from 'src/shared/constantes/constants';
import { successResponse } from 'src/shared/response-standard/response';

@Injectable()
export class GetUserUseCase {
  constructor(
    @Inject(USER_READ_REPOSITORY)
    private readonly userReadRepository: UserReadRepository,
  ) {}

  async execute(id: string, requesterRole: RoleType) {
    const user = await this.userReadRepository.findPublicById(id);
    if (!user) {
      throw new NotFoundException('No hemos podido encotrar el usuario');
    }

    this.assertCanViewRole(requesterRole, user.role.description);

    return successResponse('usuarios encontrado', {
      id: user.id,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
      rol: user.role.description,
      deleted: user.deleted,
    });
  }

  private assertCanViewRole(requesterRole: RoleType, targetRole: string) {
    if (requesterRole === RoleType.MODERATOR && targetRole !== RoleType.ADVISER) {
      throw new UnauthorizedException('Acceso denegado');
    }
  }
}
