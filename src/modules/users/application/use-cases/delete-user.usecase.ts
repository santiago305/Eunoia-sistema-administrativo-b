import { ForbiddenException, Inject, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { USER_READ_REPOSITORY, UserReadRepository } from 'src/modules/users/application/ports/user-read.repository';
import { USER_REPOSITORY, UserRepository } from 'src/modules/users/application/ports/user.repository';
import { RoleType } from 'src/shared/constantes/constants';
import { successResponse } from 'src/shared/response-standard/response';
import { UserForbiddenApplicationError } from '../errors/user-forbidden.error';
import { UserNotFoundApplicationError } from '../errors/user-not-found.error';

@Injectable()
export class DeleteUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    @Inject(USER_READ_REPOSITORY)
    private readonly userReadRepository: UserReadRepository,
  ) {}

  async execute(id: string, requester: { role: RoleType; userId: string }) {
    const requesterScope = await this.userReadRepository.findManagementScopeById(requester.userId);
    const isSuperAdmin = Boolean(requesterScope?.isSuperAdmin);

    const target = await this.userReadRepository.findPublicById(id);
    if (!target) throw new NotFoundException(new UserNotFoundApplicationError().message);

    if (!isSuperAdmin) {
      const allowedRoles = Array.isArray(requesterScope?.manageableRoleDescriptions)
        ? requesterScope.manageableRoleDescriptions.filter((value) => value && value.trim().length > 0)
        : requesterScope?.roleDescription
          ? [requesterScope.roleDescription]
          : requester.role
            ? [requester.role]
            : [];
      const allowedUserIds = Array.isArray(requesterScope?.manageableUserIds)
        ? requesterScope.manageableUserIds
        : [];

      if (!allowedRoles.includes(target.role.description) && !allowedUserIds.includes(target.id)) {
        throw new ForbiddenException(
          new UserForbiddenApplicationError('No autorizado para eliminar este usuario').message,
        );
      }
    }

    const isActive = await this.userRepository.existsByIdAndDeleted(id, false);
    if (!isActive) {
      throw new NotFoundException(new UserNotFoundApplicationError().message);
    }

    try {
      await this.userRepository.updateDeleted(id, true);
      return successResponse('El usuario ha sido eliminado');
    } catch {
      throw new InternalServerErrorException('No se pudo eliminar al usuario');
    }
  }
}
