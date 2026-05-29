import { ForbiddenException, Inject, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { USER_REPOSITORY, UserRepository } from 'src/modules/users/application/ports/user.repository';
import { USER_READ_REPOSITORY, UserReadRepository } from 'src/modules/users/application/ports/user-read.repository';
import { RoleType } from 'src/shared/constantes/constants';
import { successResponse } from 'src/shared/response-standard/response';
import { UserForbiddenApplicationError } from '../errors/user-forbidden.error';
import { UserNotFoundApplicationError } from '../errors/user-not-found.error';

@Injectable()
export class RestoreUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    @Inject(USER_READ_REPOSITORY)
    private readonly userReadRepository: UserReadRepository,
  ) {}

  async execute(id: string, requester: { role?: RoleType | null; userId: string }) {
    const requesterScope = await this.userReadRepository.findManagementScopeById(requester.userId);
    const isSuperAdmin = Boolean(requesterScope?.isSuperAdmin);

    const target = await this.userReadRepository.findManagementById(id);
    if (!target) {
      throw new NotFoundException(new UserNotFoundApplicationError().message);
    }

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
      const targetRoleDescription = target.role?.description ?? null;
      const canManageByRole = targetRoleDescription ? allowedRoles.includes(targetRoleDescription) : false;

      if (!canManageByRole && !allowedUserIds.includes(target.id)) {
        throw new ForbiddenException(
          new UserForbiddenApplicationError('No autorizado para restaurar este usuario').message,
        );
      }
    }

    const isDeleted = await this.userRepository.existsByIdAndDeleted(id, true);
    if (!isDeleted) {
      throw new NotFoundException('Este usuario todavia no ha sido eliminado');
    }

    try {
      await this.userRepository.updateDeleted(id, false);
      return successResponse('El usuario ha sido restaurado');
    } catch {
      throw new InternalServerErrorException('No se pudo restaurar al usuario');
    }
  }
}
