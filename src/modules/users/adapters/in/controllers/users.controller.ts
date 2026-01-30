import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Patch,
  UseGuards,
  Query,
  UploadedFile,
  UseInterceptors,
  ForbiddenException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { ChangePasswordUseCase } from 'src/modules/users/application/use-cases/change-password.usecase';
import { CreateUserUseCase } from 'src/modules/users/application/use-cases/create-user.usecase';
import { DeleteUserUseCase } from 'src/modules/users/application/use-cases/delete-user.usecase';
import { GetOwnUserUseCase } from 'src/modules/users/application/use-cases/get-own-user.usecase';
import { GetUserByEmailUseCase } from 'src/modules/users/application/use-cases/get-user-by-email.usecase';
import { GetUserUseCase } from 'src/modules/users/application/use-cases/get-user.usecase';
import { ListActiveUsersUseCase } from 'src/modules/users/application/use-cases/list-active-users.usecase';
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
import { ListDesactiveUseCase } from 'src/modules/users/application/use-cases/list-desactive-users.usecase';

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
    private readonly listActiveUsersUseCase: ListActiveUsersUseCase,
    private readonly listDesactiveUserCase: ListDesactiveUseCase,
    private readonly getUserUseCase: GetUserUseCase,
    private readonly getUserByEmailUseCase: GetUserByEmailUseCase,
    private readonly getOwnUserUseCase: GetOwnUserUseCase,
    private readonly deleteUserUseCase: DeleteUserUseCase,
    private readonly restoreUserUseCase: RestoreUserUseCase,
    private readonly updateAvatarUseCase: UpdateAvatarUseCase,
  ) {}

  @Post('create')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.ADMIN, RoleType.MODERATOR)
  create(@Body() dto: CreateUserDto, @CurrentUser() user: { role: RoleType }) {
    return this.createUserUseCase.execute(dto, user.role);
  }

  @Get('findAll')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.ADMIN, RoleType.MODERATOR)
  async findAll(
    @Query('page') page: string,
    @Query('role') role: string,
    @Query('sortBy') sortBy: string,
    @Query('order') order: 'ASC' | 'DESC',
    @CurrentUser() user: { role: RoleType }
  ) {
    const pageNumber = parseInt(page) || 1;
    return this.listUsersUseCase.execute({
      page: pageNumber,
      filters: { role },
      sortBy: this.normalizeSortBy(sortBy),
      order: this.normalizeOrder(order),
    }, user.role);
  }

  @Get('actives')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.ADMIN, RoleType.MODERATOR)
  async findActives(
    @Query('page') page: string,
    @Query('role') role: string,
    @Query('sortBy') sortBy: string,
    @Query('order') order: 'ASC' | 'DESC',
    @CurrentUser() user: { role: RoleType }
  ) {
    const pageNumber = parseInt(page) || 1;
    return this.listActiveUsersUseCase.execute({
      page: pageNumber,
      filters: { role },
      sortBy: this.normalizeSortBy(sortBy),
      order: this.normalizeOrder(order),
    }, user.role);
  }
  
  @Get('desactive')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.ADMIN, RoleType.MODERATOR)
  async findDesactive(
    @Query('page') page: string,
    @Query('role') role: string,
    @Query('sortBy') sortBy: string,
    @Query('order') order: 'ASC' | 'DESC',
    @CurrentUser() user: { role: RoleType }
  ) {
    const pageNumber = parseInt(page) || 1;
    return this.listDesactiveUserCase.execute({
      page: pageNumber,
      filters: { role },
      sortBy: this.normalizeSortBy(sortBy),
      order: this.normalizeOrder(order),
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

  @Patch('update/:id')
  @UseGuards(JwtAuthGuard)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: { id: string }
  ) {
    if (id !== user.id) {
      throw new ForbiddenException('No puedes editar otro usuario');
    }
    return this.updateUserUseCase.execute(id, dto, user.id);
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

  @Post(':id/avatar')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: diskStorage({
        destination: './assets/uploadusers',
        filename: (req, file, cb) => {
          const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extname(file.originalname)}`;
          cb(null, uniqueName);
        },
      }),
      limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
      fileFilter: (req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (!allowed.includes(file.mimetype)) {
          return cb(new Error('Solo se permiten imagenes JPG/PNG/WEBP/GIF'), false);
        }
        cb(null, true);
      },
    }),
  )

  
  async uploadAvatar(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: { id: string }
  ) {
    // Validacion de acceso: solo el dueno puede subir su avatar
    if (user?.id && user.id !== id) {
      throw new ForbiddenException('No puedes subir avatar de otro usuario');
    }
    const filePath = `/assets/uploadusers/${file.filename}`;
    return this.updateAvatarUseCase.execute(id, filePath, user?.id);
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

