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
import { UsersService } from 'src/modules/users/application/use-cases/users.service';
import { CreateUserDto } from 'src/modules/users/adapters/in/dtos/create-user.dto';
import { UpdateUserDto } from 'src/modules/users/adapters/in/dtos/update-user.dto';
import { ChangePasswordDto } from 'src/modules/users/adapters/in/dtos/change-password.dto';
import { Roles } from 'src/shared/utilidades/decorators';
import { RoleType } from 'src/shared/constantes/constants';
import { JwtAuthGuard } from 'src/modules/auth/adapters/in/guards/jwt-auth.guard';
import { RolesGuard } from 'src/shared/utilidades/guards/roles.guard';
import { User as CurrentUser } from 'src/shared/utilidades/decorators/user.decorator';

/**
 * Controlador para la gestiAn de usuarios.
 */
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('create')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.ADMIN, RoleType.MODERATOR)
  create(@Body() dto: CreateUserDto, @CurrentUser() user: { role: RoleType }) {
    return this.usersService.create(dto, user.role);
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
    return this.usersService.findAll({
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
    return this.usersService.findActives({
      page: pageNumber,
      filters: { role },
      sortBy: this.normalizeSortBy(sortBy),
      order: this.normalizeOrder(order),
    }, user.role);
  }

 @Get('me')
  @UseGuards(JwtAuthGuard)
  getProfile(@CurrentUser() user: { id: string }) {
    return this.usersService.findOwnUser(user.id);
  }

  @Get('search/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.ADMIN, RoleType.MODERATOR)
  findOne(@Param('id') id: string, @CurrentUser() user: { role: RoleType }) {
    return this.usersService.findOne(id, user.role);
  }

  @Get('email/:email')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.ADMIN, RoleType.MODERATOR)
  findByEmail(@Param('email') email: string, @CurrentUser() user: { role: RoleType }) {
    return this.usersService.findByEmail(email, user.role);
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
    return this.usersService.update(id, dto, user.id);
  }

  @Patch('delete/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.ADMIN, RoleType.MODERATOR)
  remove(@Param('id') id: string, @CurrentUser() user: { role: RoleType }) {
    return this.usersService.remove(id, user.role);
  }

  @Patch('restore/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.ADMIN)
  restore(@Param('id') id: string) {
    return this.usersService.restore(id);
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
    return this.usersService.changePassword(id, body.currentPassword, body.newPassword, user.id);
  }


  // Subir avatar del usuario
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
    return this.usersService.updateAvatar(id, filePath, user?.id);
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

