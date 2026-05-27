import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { NotificationsService } from 'src/modules/mail/application/use-cases/notifications.service';
import { COMPANY_REPOSITORY, CompanyRepository } from 'src/modules/companies/domain/ports/company.repository';
import * as argon2 from 'argon2';
import { ROLE_READ_REPOSITORY, RoleReadRepository } from 'src/modules/roles/application/ports/role-read.repository';
import { CreateUserDto } from 'src/modules/users/adapters/in/dtos/create-user.dto';
import { USER_READ_REPOSITORY, UserReadRepository } from 'src/modules/users/application/ports/user-read.repository';
import { USER_REPOSITORY, UserRepository } from 'src/modules/users/application/ports/user.repository';
import { Email, Password, RoleId, UserFactory } from 'src/modules/users/domain';
import { envs } from 'src/infrastructure/config/envs';
import { MASTER_ROLE_DESCRIPTION, RoleType } from 'src/shared/constantes/constants';
import { successResponse } from 'src/shared/response-standard/response';
import { UserConflictApplicationError } from '../errors/user-conflict.error';
import { UserForbiddenApplicationError } from '../errors/user-forbidden.error';

@Injectable()
export class CreateUserUseCase {
  private readonly logger = new Logger(CreateUserUseCase.name);

  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    @Inject(ROLE_READ_REPOSITORY)
    private readonly roleReadRepository: RoleReadRepository,
    @Inject(USER_READ_REPOSITORY)
    private readonly userReadRepository: UserReadRepository,
    @Inject(COMPANY_REPOSITORY)
    private readonly companyRepository: CompanyRepository,
    private readonly notificationsService: NotificationsService,
  ) {}

  private sanitizeCompanyName(value?: string | null) {
    const normalized = String(value ?? '')
      .replace(/[<>]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 80);

    return normalized;
  }

  private sanitizeDisplayText(value?: string | null, maxLength = 80) {
    return String(value ?? '')
      .replace(/[<>]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, maxLength);
  }

  private async resolveCompanyName() {
    const company = await this.companyRepository.findSingle();
    const fromCompany = this.sanitizeCompanyName(company?.name);
    if (fromCompany) return fromCompany;

    const fromEnv = this.sanitizeCompanyName(envs.appCompanyName);
    if (fromEnv) return fromEnv;

    return 'Eunoia';
  }

  async execute(dto: CreateUserDto, requester: { role: RoleType; userId: string }) {
    const requesterScope = await this.userReadRepository.findManagementScopeById(requester.userId);
    const isSuperAdmin = Boolean(requesterScope?.isSuperAdmin);

    const exists = await this.userRepository.existsByEmail(new Email(dto.email));
    if (exists) {
      throw new ConflictException(new UserConflictApplicationError('Este email ya esta registrado').message);
    }

    const hashedPassword = await argon2.hash(dto.password, {
      type: argon2.argon2id,
    });

    if (!dto.roleId) {
      throw new BadRequestException('El rol es obligatorio');
    }

    const roleResult = await this.roleReadRepository.findById(dto.roleId);
    if (!roleResult) {
      throw new NotFoundException('Rol invalido');
    }

    const targetRoleId = roleResult.id;
    const targetRoleDescription = roleResult.description;

    const allowedConfiguredRoles = Array.isArray(requesterScope?.manageableRoleDescriptions)
      ? requesterScope.manageableRoleDescriptions.filter((value) => value && value.trim().length > 0)
      : [];
    const fallbackAllowedRoles = requesterScope?.roleDescription
      ? [requesterScope.roleDescription]
      : requester.role
        ? [requester.role]
        : [];
    const allowedRoles = allowedConfiguredRoles.length > 0 ? allowedConfiguredRoles : fallbackAllowedRoles;

    if (!isSuperAdmin && !allowedRoles.includes(targetRoleDescription)) {
      throw new ForbiddenException(
        new UserForbiddenApplicationError('No autorizado para crear usuarios con ese rol').message,
      );
    }

    if (String(targetRoleDescription ?? '').trim().toLowerCase() === MASTER_ROLE_DESCRIPTION) {
      throw new ForbiddenException(
        new UserForbiddenApplicationError('No autorizado para asignar el rol maestro').message,
      );
    }

    const domainUser = UserFactory.createNew({
      name: dto.name,
      email: new Email(dto.email),
      password: new Password(hashedPassword),
      roleId: new RoleId(targetRoleId),
      avatarUrl: dto.avatarUrl,
      telefono: dto.telefono,
      createdByUserId: requester.userId,
    });

    try {
      const created = await this.userRepository.save(domainUser);

      try {
        const companyName = await this.resolveCompanyName();
        const safeUserName = this.sanitizeDisplayText(dto.name, 120) || 'usuario';
        await this.notificationsService.createNotificationForUsers({
          recipientUserIds: [created.id],
          type: 'USER_WELCOME',
          category: 'onboarding',
          title: `Bienvenido a ${companyName}`,
          message: `Hola ${safeUserName}, te damos la bienvenida a ${companyName}.`,
          priority: 'NORMAL',
          showAsToast: true,
          sourceModule: 'system',
          sourceEntityType: 'user',
          sourceEntityId: created.id,
          metadata: {
            companyName,
            createdByUserId: requester.userId,
          },
        });
      } catch (notificationError) {
        this.logger.warn(
          `No se pudo crear la notificacion de bienvenida para userId=${created.id}: ${notificationError instanceof Error ? notificationError.message : String(notificationError)}`,
        );
      }

      return successResponse('Usuario creado correctamente', { id: created.id });
    } catch {
      throw new InternalServerErrorException('Se ha producido un error al crear al usuario');
    }
  }
}
