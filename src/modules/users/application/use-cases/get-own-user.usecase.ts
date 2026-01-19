import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { USER_READ_REPOSITORY, UserReadRepository } from 'src/modules/users/application/ports/user-read.repository';
import { successResponse } from 'src/shared/response-standard/response';

@Injectable()
export class GetOwnUserUseCase {
  constructor(
    @Inject(USER_READ_REPOSITORY)
    private readonly userReadRepository: UserReadRepository,
  ) {}

  async execute(id: string) {
    const user = await this.userReadRepository.findPublicById(id);
    if (!user) throw new UnauthorizedException('Usuario no encontrado');

    return successResponse('Usuario encontrado', user);
  }
}
