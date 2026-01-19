import { Inject } from '@nestjs/common';
import { ROLE_READ_REPOSITORY, RoleReadRepository } from '../ports/role-read.repository';

export class GetRoleByIdUseCase {
  constructor(
    @Inject(ROLE_READ_REPOSITORY)
    private readonly roleReadRepository: RoleReadRepository,
  ) {}

  async execute(id: string) {
    return this.roleReadRepository.findById(id);
  }
}
