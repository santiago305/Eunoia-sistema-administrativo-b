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
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { UsersService } from 'src/modules/users/use-cases/users.service';
import { CreateUserDto } from 'src/modules/users/adapters/in/dtos/create-user.dto';
import { UpdateUserDto } from 'src/modules/users/adapters/in/dtos/update-user.dto';
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
  @Roles(RoleType.ADMIN)
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
    @Query('order') order: 'ASC' | 'DESC'
  ) {
    const pageNumber = parseInt(page) || 1;
    return this.usersService.findAll({
      page: pageNumber,
      filters: { role },
      sortBy: sortBy || 'user.createdAt',
      order: order || 'DESC',
    });
  }

  @Get('actives')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.ADMIN, RoleType.MODERATOR)
  async findActives(
    @Query('page') page: string,
    @Query('role') role: string,
    @Query('sortBy') sortBy: string,
    @Query('order') order: 'ASC' | 'DESC'
  ) {
    const pageNumber = parseInt(page) || 1;
    return this.usersService.findActives({
      page: pageNumber,
      filters: { role },
      sortBy: sortBy || 'user.createdAt',
      order: order || 'DESC',
    });
  }

 @Get('me')
  @UseGuards(JwtAuthGuard)
  getProfile(@CurrentUser() user: { id: string }) {
    return this.usersService.findOwnUser(user.id);
  }

  @Get('search/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.ADMIN, RoleType.MODERATOR)
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Get('email/:email')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.ADMIN, RoleType.MODERATOR)
  findByEmail(@Param('email') email: string) {
    return this.usersService.findByEmail(email);
  }

  @Patch('update/:id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  @Patch('delete/:id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
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
    @Body() body: { currentPassword: string; newPassword: string }
  ) {
    return this.usersService.changePassword(id, body.currentPassword, body.newPassword);
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
  async uploadAvatar(@Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    const filePath = `/assets/uploadusers/${file.filename}`;
    return this.usersService.updateAvatar(id, filePath);
  }
}

