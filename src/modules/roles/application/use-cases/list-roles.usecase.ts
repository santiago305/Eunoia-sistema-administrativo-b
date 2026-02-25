import { Inject } from '@nestjs/common';
import {
  ROLE_READ_REPOSITORY,
  RoleListStatus,
  RoleReadRepository,
} from '../ports/role-read.repository';

export class ListRolesUseCase {
  constructor(
    @Inject(ROLE_READ_REPOSITORY)
    private readonly roleReadRepository: RoleReadRepository,
  ) {}

  async execute(params?: { status?: RoleListStatus }) {
    return this.roleReadRepository.listRoles({ status: params?.status ?? 'all' });
  }
}
