import { Injectable } from '@nestjs/common';
import { CreateUserDto } from 'src/modules/users/adapters/in/dtos/create-user.dto';
import { UpdateUserDto } from 'src/modules/users/adapters/in/dtos/update-user.dto';
import { RoleType } from 'src/shared/constantes/constants';
import { ChangePasswordUseCase } from './change-password.usecase';
import { CreateUserUseCase } from './create-user.usecase';
import { DeleteUserUseCase } from './delete-user.usecase';
import { GetOwnUserUseCase } from './get-own-user.usecase';
import { GetUserByEmailUseCase } from './get-user-by-email.usecase';
import { GetUserUseCase } from './get-user.usecase';
import { GetUserWithPasswordByEmailUseCase } from './get-user-with-password-by-email.usecase';
import { ListActiveUsersUseCase } from './list-active-users.usecase';
import { ListUsersUseCase } from './list-users.usecase';
import { RestoreUserUseCase } from './restore-user.usecase';
import { UpdateAvatarUseCase } from './update-avatar.usecase';
import { UpdateUserUseCase } from './update-user.usecase';

@Injectable()
export class UsersService {
  constructor(
    private readonly createUserUseCase: CreateUserUseCase,
    private readonly updateUserUseCase: UpdateUserUseCase,
    private readonly changePasswordUseCase: ChangePasswordUseCase,
    private readonly listUsersUseCase: ListUsersUseCase,
    private readonly listActiveUsersUseCase: ListActiveUsersUseCase,
    private readonly getUserUseCase: GetUserUseCase,
    private readonly getUserByEmailUseCase: GetUserByEmailUseCase,
    private readonly getOwnUserUseCase: GetOwnUserUseCase,
    private readonly deleteUserUseCase: DeleteUserUseCase,
    private readonly restoreUserUseCase: RestoreUserUseCase,
    private readonly updateAvatarUseCase: UpdateAvatarUseCase,
    private readonly getUserWithPasswordByEmailUseCase: GetUserWithPasswordByEmailUseCase,
  ) {}

  async findAll(
    params: {
      page?: number,
      filters?: { role?: string },
      sortBy?: string,
      order?: 'ASC' | 'DESC'
    },
    requesterRole: RoleType
  ) {
    return this.listUsersUseCase.execute(params, requesterRole);
  }

  async findActives(
    params: {
      page?: number,
      filters?: { role?: string },
      sortBy?: string,
      order?: 'ASC' | 'DESC'
    },
    requesterRole: RoleType
  ){
    return this.listActiveUsersUseCase.execute(params, requesterRole);
  }

  async findOne(id: string, requesterRole: RoleType) {
    return this.getUserUseCase.execute(id, requesterRole);
  }

  async findByEmail(email: string, requesterRole: RoleType) {
    return this.getUserByEmailUseCase.execute(email, requesterRole);
  }
  async findOwnUser(id: string) {
    return this.getOwnUserUseCase.execute(id);
  }

  async changePassword(id: string, currentPassword: string, newPassword: string, requesterUserId: string) {
    return this.changePasswordUseCase.execute(id, currentPassword, newPassword, requesterUserId);
  }

  async create(dto: CreateUserDto, requesterRole: RoleType) {
    return this.createUserUseCase.execute(dto, requesterRole);
  }
  
  async update(id: string, dto: UpdateUserDto, requesterUserId: string) {
    return this.updateUserUseCase.execute(id, dto, requesterUserId);
  }
  async remove(id: string, requesterRole: RoleType) {
    return this.deleteUserUseCase.execute(id, requesterRole);
  }

  async restore(id: string ) {
    return this.restoreUserUseCase.execute(id);
  }

  async findWithPasswordByEmail(email: string): Promise<{
    id: string;
    email: string;
    password: string;
    role: { description: string };
  } | null> {
    return this.getUserWithPasswordByEmailUseCase.execute(email);
  }


  async updateAvatar(id: string, filePath: string, requesterUserId?: string) {
    return this.updateAvatarUseCase.execute(id, filePath, requesterUserId);
  }
}

