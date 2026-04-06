import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { SESSION_READ_REPOSITORY, SessionReadRepository } from '../ports/session-read.repository';
import { SessionInvalidTokenApplicationError } from '../errors/session-invalid-token.error';

@Injectable()
export class ListActiveSessionsUseCase {
  constructor(
    @Inject(SESSION_READ_REPOSITORY)
    private readonly sessionReadRepository: SessionReadRepository,
  ) {}

  async execute(userId: string) {
    const id = userId?.trim();
    if (!id) {
      throw new UnauthorizedException(new SessionInvalidTokenApplicationError().message);
    }

    return this.sessionReadRepository.listActiveByUserId(id);
  }
}
