import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ROLE_READ_REPOSITORY, RoleReadRepository } from '../ports/role-read.repository';
import { RoleNotFoundApplicationError } from '../errors/role-not-found.error';

@Injectable()
export class GetRoleByIdUseCase {
  constructor(
    @Inject(ROLE_READ_REPOSITORY)
    private readonly roleReadRepository: RoleReadRepository,
  ) {}

  async execute(id: string) {
    const role = await this.roleReadRepository.findById(id);
    if (!role) {
      throw new NotFoundException(new RoleNotFoundApplicationError().message);
    }
    return role;
  }
}
