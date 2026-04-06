import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ROLE_REPOSITORY, RoleRepository } from '../ports/role.repository';
import { UpdateRoleDto } from '../../adapters/in/dtos/update-role.dto';
import {
  ROLE_READ_REPOSITORY,
  RoleReadRepository,
} from '../ports/role-read.repository';
import { RoleType } from 'src/shared/constantes/constants';
import { RoleConflictApplicationError } from '../errors/role-conflict.error';
import { RoleForbiddenApplicationError } from '../errors/role-forbidden.error';
import { RoleNotFoundApplicationError } from '../errors/role-not-found.error';

const PROTECTED_SYSTEM_ROLES = new Set<string>([
  RoleType.ADMIN,
  RoleType.MODERATOR,
  RoleType.ADVISER,
]);

@Injectable()
export class UpdateRoleUseCase {
  constructor(
    @Inject(ROLE_READ_REPOSITORY)
    private readonly roleReadRepository: RoleReadRepository,
    @Inject(ROLE_REPOSITORY)
    private readonly roleRepository: RoleRepository,
  ) {}

  async execute(id: string, dto: UpdateRoleDto) {
    if (dto.description === undefined) {
      throw new BadRequestException('Debe enviar al menos un campo para actualizar');
    }
    const normalizedDescription = dto.description.trim().toLowerCase();
    if (!normalizedDescription) {
      throw new BadRequestException('La descripcion no puede quedar vacia');
    }

    const role = await this.roleRepository.findById(id);

    if (!role) {
      throw new NotFoundException(new RoleNotFoundApplicationError().message);
    }

    const nextDescription = normalizedDescription;
    const currentDescription = (role.description || '').trim().toLowerCase();
    const isSemanticDescriptionChange = nextDescription !== currentDescription;

    if (PROTECTED_SYSTEM_ROLES.has(currentDescription) && isSemanticDescriptionChange) {
      throw new ForbiddenException(
        new RoleForbiddenApplicationError('No se puede renombrar un rol base del sistema').message,
      );
    }

    if (isSemanticDescriptionChange) {
      const exists = await this.roleReadRepository.existsByDescription(nextDescription);
      if (exists) {
        throw new ConflictException(new RoleConflictApplicationError().message);
      }
    }

    role.description = nextDescription;
    try {
      await this.roleRepository.save(role);
    } catch (error: any) {
      if (error?.code === '23505') {
        throw new ConflictException(new RoleConflictApplicationError().message);
      }
      throw error;
    }

    return { message: 'Rol actualizado correctamente' };
  }
}
