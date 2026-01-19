import { Inject, Injectable } from '@nestjs/common';
import { ROLE_READ_REPOSITORY, RoleReadRepository } from '../ports/role-read.repository';

@Injectable()
export class ListActiveRolesUseCase {
  constructor(
    @Inject(ROLE_READ_REPOSITORY)
    private readonly roleReadRepository: RoleReadRepository,
  ) {}

  async execute() {
    return this.roleReadRepository.listRoles({ includeDeleted: false });
  }
}
