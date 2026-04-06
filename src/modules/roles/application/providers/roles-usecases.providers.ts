import { CreateRoleUseCase } from '../use-cases/create-role.usecase';
import { DeleteRoleUseCase } from '../use-cases/delete-role.usecase';
import { GetRoleByIdUseCase } from '../use-cases/get-role-by-id.usecase';
import { ListRolesUseCase } from '../use-cases/list-roles.usecase';
import { RestoreRoleUseCase } from '../use-cases/restore-role.usecase';
import { UpdateRoleUseCase } from '../use-cases/update-role.usecase';

export const rolesUseCasesProviders = [
  CreateRoleUseCase,
  ListRolesUseCase,
  GetRoleByIdUseCase,
  UpdateRoleUseCase,
  DeleteRoleUseCase,
  RestoreRoleUseCase,
];
