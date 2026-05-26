import { Inject, Injectable } from '@nestjs/common';
import {
  ROLE_READ_REPOSITORY,
  RoleListStatus,
  RoleReadRepository,
} from '../ports/role-read.repository';

@Injectable()
export class ListRolesUseCase {
  constructor(
    @Inject(ROLE_READ_REPOSITORY)
    private readonly roleReadRepository: RoleReadRepository,
  ) {}

  async execute(params?: { status?: RoleListStatus }) {
    const roles = await this.roleReadRepository.listRoles({ status: params?.status ?? 'all' });

    return roles;
  }
}
