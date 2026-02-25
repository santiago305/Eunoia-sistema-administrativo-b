import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChangePasswordUseCase } from '../application/use-cases/change-password.usecase';
import { CreateUserUseCase } from '../application/use-cases/create-user.usecase';
import { DeleteUserUseCase } from '../application/use-cases/delete-user.usecase';
import { GetOwnUserUseCase } from '../application/use-cases/get-own-user.usecase';
import { GetUserByEmailUseCase } from '../application/use-cases/get-user-by-email.usecase';
import { GetUserUseCase } from '../application/use-cases/get-user.usecase';
import { GetUserWithPasswordByEmailUseCase } from '../application/use-cases/get-user-with-password-by-email.usecase';
import { ListUsersUseCase } from '../application/use-cases/list-users.usecase';
import { RestoreUserUseCase } from '../application/use-cases/restore-user.usecase';
import { UpdateAvatarUseCase } from '../application/use-cases/update-avatar.usecase';
import { UpdateUserUseCase } from '../application/use-cases/update-user.usecase';
import { UsersController } from '../adapters/in/controllers/users.controller';
import { User } from '../adapters/out/persistence/typeorm/entities/user.entity';
import { Role } from '../../roles/adapters/out/persistence/typeorm/entities/role.entity';
import { RolesModule } from 'src/modules/roles/infrastructure/roles.module';
import { USER_REPOSITORY } from '../application/ports/user.repository';
import { TypeormUserRepository } from '../adapters/out/persistence/typeorm/repositories/typeorm-user.repository';
import { USER_READ_REPOSITORY } from '../application/ports/user-read.repository';
import { TypeormUserReadRepository } from '../adapters/out/persistence/typeorm/repositories/typeorm-user-read.repository';
import { RemoveAvatarUseCase } from '../application/use-cases/remove-avatar.usecase';
import { IMAGE_PROCESSOR } from 'src/shared/application/ports/image-processor.port';
import { FILE_STORAGE } from 'src/shared/application/ports/file-storage.port';
import { SharpImageProcessorService } from 'src/shared/utilidades/services/sharp-image-processor.service';
import { LocalFileStorageService } from 'src/shared/utilidades/services/local-file-storage.service';

/**
 * Modulo encargado de la gestiAn de usuarios.
 * Incluye el controlador, servicio y entidad User.
 */
@Module({
  imports: [
    RolesModule,
    TypeOrmModule.forFeature([User, Role]),
  ], // Importa la entidad User para operaciones con TypeORM
  controllers: [UsersController], // Controlador REST para endpoints relacionados con usuarios
  providers: [
    CreateUserUseCase,
    UpdateUserUseCase,
    ChangePasswordUseCase,
    ListUsersUseCase,
    GetUserUseCase,
    GetUserByEmailUseCase,
    GetOwnUserUseCase,
    DeleteUserUseCase,
    RestoreUserUseCase,
    UpdateAvatarUseCase,
    GetUserWithPasswordByEmailUseCase,
    RemoveAvatarUseCase,
    {
      provide: IMAGE_PROCESSOR,
      useClass: SharpImageProcessorService,
    },
    {
      provide: FILE_STORAGE,
      useClass: LocalFileStorageService,
    },
    {
      provide: USER_REPOSITORY,
      useClass: TypeormUserRepository,
    },
    {
      provide: USER_READ_REPOSITORY,
      useClass: TypeormUserReadRepository,
    },
  ], // Servicio con la lИgica de negocio para usuarios
  exports: [
    USER_REPOSITORY,
    USER_READ_REPOSITORY,
    CreateUserUseCase,
    GetUserWithPasswordByEmailUseCase,
  ], // Exporta repositorios y use cases usados en otros modulos
})
export class UsersModule {}
