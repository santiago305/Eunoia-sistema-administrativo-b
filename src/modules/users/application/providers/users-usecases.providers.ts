import { ChangePasswordUseCase } from "../use-cases/change-password.usecase";
import { CountUsersByRoleUseCase } from "../use-cases/count-users-by-role.usecase";
import { CreateUserUseCase } from "../use-cases/create-user.usecase";
import { DeleteUserUseCase } from "../use-cases/delete-user.usecase";
import { GetOwnUserUseCase } from "../use-cases/get-own-user.usecase";
import { GetUserByEmailUseCase } from "../use-cases/get-user-by-email.usecase";
import { GetUserUseCase } from "../use-cases/get-user.usecase";
import { GetUserWithPasswordByEmailUseCase } from "../use-cases/get-user-with-password-by-email.usecase";
import { ListUsersUseCase } from "../use-cases/list-users.usecase";
import { RemoveAvatarUseCase } from "../use-cases/remove-avatar.usecase";
import { RestoreUserUseCase } from "../use-cases/restore-user.usecase";
import { UpdateAvatarUseCase } from "../use-cases/update-avatar.usecase";
import { UpdateUserRoleUseCase } from "../use-cases/update-user-role.usecase";
import { UpdateUserUseCase } from "../use-cases/update-user.usecase";

export const usersUsecasesProviders = [
  CreateUserUseCase,
  UpdateUserUseCase,
  UpdateUserRoleUseCase,
  ChangePasswordUseCase,
  ListUsersUseCase,
  CountUsersByRoleUseCase,
  GetUserUseCase,
  GetUserByEmailUseCase,
  GetOwnUserUseCase,
  DeleteUserUseCase,
  RestoreUserUseCase,
  UpdateAvatarUseCase,
  GetUserWithPasswordByEmailUseCase,
  RemoveAvatarUseCase,
];
