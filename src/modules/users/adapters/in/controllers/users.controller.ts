import {
  Controller,
  Post,
  Delete,
  Get,
  Body,
  Param,
  Patch,
  UseGuards,
  Query,
  UploadedFile,
  UseInterceptors,
  ForbiddenException,
  BadRequestException,
  ConflictException,
  Inject,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ChangePasswordUseCase } from 'src/modules/users/application/use-cases/change-password.usecase';
import { CreateUserUseCase } from 'src/modules/users/application/use-cases/create-user.usecase';
import { DeleteUserUseCase } from 'src/modules/users/application/use-cases/delete-user.usecase';
import { GetOwnUserUseCase } from 'src/modules/users/application/use-cases/get-own-user.usecase';
import { GetUserByEmailUseCase } from 'src/modules/users/application/use-cases/get-user-by-email.usecase';
import { GetUserUseCase } from 'src/modules/users/application/use-cases/get-user.usecase';
import { ListUsersUseCase } from 'src/modules/users/application/use-cases/list-users.usecase';
import { RestoreUserUseCase } from 'src/modules/users/application/use-cases/restore-user.usecase';
import { UpdateAvatarUseCase } from 'src/modules/users/application/use-cases/update-avatar.usecase';
import { UpdateUserUseCase } from 'src/modules/users/application/use-cases/update-user.usecase';
import { CreateUserDto } from 'src/modules/users/adapters/in/dtos/create-user.dto';
import { UpdateUserDto } from 'src/modules/users/adapters/in/dtos/update-user.dto';
import { ChangePasswordDto } from 'src/modules/users/adapters/in/dtos/change-password.dto';
import { Roles } from 'src/shared/utilidades/decorators';
import { RoleType } from 'src/shared/constantes/constants';
import { JwtAuthGuard } from 'src/modules/auth/adapters/in/guards/jwt-auth.guard';
import { RolesGuard } from 'src/shared/utilidades/guards/roles.guard';
import { User as CurrentUser } from 'src/shared/utilidades/decorators/user.decorator';
import { RemoveAvatarUseCase } from 'src/modules/users/application/use-cases/remove-avatar.usecase';
import { IMAGE_PROCESSOR, ImageProcessor } from 'src/shared/application/ports/image-processor.port';
import { FILE_STORAGE, FileStorage } from 'src/shared/application/ports/file-storage.port';
import { ImageProcessingError } from 'src/shared/application/errors/image-processing.error';
import {
  USER_LIST_STATUSES,
  UserListStatus,
} from 'src/modules/users/application/ports/user-read.repository';
import {
  FileStorageConflictError,
  InvalidFileStoragePathError
} from 'src/shared/application/errors/file-storage.errors';

/**
 * Controlador para la gestiAn de usuarios.
 */
@Controller('users')
export class UsersController {
  constructor(
    private readonly createUserUseCase: CreateUserUseCase,
    private readonly updateUserUseCase: UpdateUserUseCase,
    private readonly changePasswordUseCase: ChangePasswordUseCase,
    private readonly listUsersUseCase: ListUsersUseCase,
    private readonly getUserUseCase: GetUserUseCase,
    private readonly getUserByEmailUseCase: GetUserByEmailUseCase,
    private readonly getOwnUserUseCase: GetOwnUserUseCase,
    private readonly deleteUserUseCase: DeleteUserUseCase,
    private readonly restoreUserUseCase: RestoreUserUseCase,
    private readonly updateAvatarUseCase: UpdateAvatarUseCase,
    private readonly removeAvatarUseCase: RemoveAvatarUseCase,
    @Inject(IMAGE_PROCESSOR)
    private readonly imageProcessor: ImageProcessor,
    @Inject(FILE_STORAGE)
    private readonly fileStorage: FileStorage,
  ) {}

  @Post('create')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.ADMIN, RoleType.MODERATOR)
  create(@Body() dto: CreateUserDto, @CurrentUser() user: { role: RoleType }) {
    return this.createUserUseCase.execute(dto, user.role);
  }

  @Get('')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.ADMIN, RoleType.MODERATOR)
  async findAll(
    @Query('page') page: string,
    @Query('role') role: string,
    @Query('sortBy') sortBy: string,
    @Query('order') order: 'ASC' | 'DESC',
    @Query('status') status: string,
    @CurrentUser() user: { role: RoleType }
  ) {
    if (status && !USER_LIST_STATUSES.includes(status as UserListStatus)) {
      throw new BadRequestException(
        `Invalid status '${status}'. Allowed values: ${USER_LIST_STATUSES.join(', ')}`,
      );
    }
    const pageNumber = parseInt(page) || 1;
    return this.listUsersUseCase.execute({
      page: pageNumber,
      filters: { role },
      sortBy: this.normalizeSortBy(sortBy),
      order: this.normalizeOrder(order),
      status: (status as UserListStatus | undefined) ?? 'all',
    }, user.role);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getProfile(@CurrentUser() user: { id: string }) {
    return this.getOwnUserUseCase.execute(user.id);
  }

  @Get('search/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.ADMIN, RoleType.MODERATOR)
  findOne(@Param('id') id: string, @CurrentUser() user: { role: RoleType }) {
    return this.getUserUseCase.execute(id, user.role);
  }

  @Get('email/:email')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.ADMIN, RoleType.MODERATOR)
  findByEmail(@Param('email') email: string, @CurrentUser() user: { role: RoleType }) {
    return this.getUserByEmailUseCase.execute(email, user.role);
  }

  @Patch('me/update')
  @UseGuards(JwtAuthGuard)
  update(
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: { id: string }
  ) {
    return this.updateUserUseCase.execute(user.id, dto, user.id);
  }
  @Delete('me/avatar')
  @UseGuards(JwtAuthGuard)
  removeAvatar(
    @CurrentUser() user: { id: string }
  ) {
    return this.removeAvatarUseCase.execute(user.id);
  }

  @Patch('delete/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.ADMIN, RoleType.MODERATOR)
  remove(@Param('id') id: string, @CurrentUser() user: { role: RoleType }) {
    return this.deleteUserUseCase.execute(id, user.role);
  }

  @Patch('restore/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.ADMIN)
  restore(@Param('id') id: string) {
    return this.restoreUserUseCase.execute(id);
  }

  @Patch('change-password/:id')
  @UseGuards(JwtAuthGuard)
  async changePassword(
    @Param('id') id: string,
    @Body() body: ChangePasswordDto,
    @CurrentUser() user: { id: string }
  ) {
    if (id !== user.id) {
      throw new ForbiddenException('No puedes cambiar la contrasena de otro usuario');
    }
    return this.changePasswordUseCase.execute(id, body.currentPassword, body.newPassword, user.id);
  }

  @Patch('me/change-password')
  @UseGuards(JwtAuthGuard)
  async changeOwnPassword(
    @Body() body: ChangePasswordDto,
    @CurrentUser() user: { id: string }
  ) {
    return this.changePasswordUseCase.execute(
      user.id,
      body.currentPassword,
      body.newPassword,
      user.id,
    );
  }

  @Post('me/avatar')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: memoryStorage(),
      limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
      fileFilter: (req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (!allowed.includes(file.mimetype)) {
          return cb(new BadRequestException('Solo se permiten imagenes JPG/PNG/WEBP/GIF'), false);
        }
        cb(null, true);
      },
    }),
  )

  
  async uploadAvatar(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: { id: string }
  ) {
    if (!file?.buffer) {
      throw new BadRequestException('Debes enviar un archivo de avatar');
    }

    let savedRelativePath: string | null = null;
    try {
      const processed = await this.imageProcessor.toWebp({
        buffer: file.buffer,
        maxWidth: 512,
        maxHeight: 512,
        quality: 80,
        maxInputBytes: 50 * 1024 * 1024,
        maxInputPixels: 20_000_000,
        maxOutputBytes: 1 * 1024 * 1024,
      });

      const { relativePath } = await this.fileStorage.save({
        directory: 'users',
        buffer: processed.buffer,
        extension: processed.extension,
        filenamePrefix: user.id,
      });
      savedRelativePath = relativePath;

      return this.updateAvatarUseCase.execute(user.id, relativePath);
    } catch (error) {
      if (savedRelativePath) {
        try {
          await this.fileStorage.delete(savedRelativePath);
        } catch (cleanupError) {
          console.error('[UsersController] No se pudo limpiar avatar temporal tras error:', cleanupError);
        }
      }

      if (
        error instanceof ImageProcessingError ||
        error instanceof InvalidFileStoragePathError
      ) {
        throw new BadRequestException(error.message);
      }

      if (error instanceof FileStorageConflictError) {
        throw new ConflictException(error.message);
      }

      throw error;
    }
  }

  private normalizeSortBy(sortBy?: string) {
    const value = (sortBy || '').toLowerCase();
    if (value === 'name' || value === 'user.name') return 'user.name';
    if (value === 'email' || value === 'user.email') return 'user.email';
    if (value === 'createdat' || value === 'user.createdat') return 'user.createdAt';
    if (value === 'role' || value === 'rol' || value === 'role.description') return 'role.description';
    if (value === 'deleted' || value === 'user.deleted') return 'user.deleted';
    return 'user.createdAt';
  }

  private normalizeOrder(order?: 'ASC' | 'DESC') {
    return order === 'ASC' ? 'ASC' : 'DESC';
  }
}

