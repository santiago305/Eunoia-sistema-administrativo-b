import { ROLE_READ_REPOSITORY } from '../application/ports/role-read.repository';
import { ROLE_REPOSITORY } from '../application/ports/role.repository';
import { rolesUseCasesProviders } from '../application/providers/roles-usecases.providers';
import { TypeormRoleReadRepository } from '../adapters/out/persistence/typeorm/repositories/typeorm-role-read.repository';
import { TypeormRoleRepository } from '../adapters/out/persistence/typeorm/repositories/typeorm-role.repository';

export const rolesModuleProviders = [
  ...rolesUseCasesProviders,
  {
    provide: ROLE_REPOSITORY,
    useClass: TypeormRoleRepository,
  },
  {
    provide: ROLE_READ_REPOSITORY,
    useClass: TypeormRoleReadRepository,
  },
];
