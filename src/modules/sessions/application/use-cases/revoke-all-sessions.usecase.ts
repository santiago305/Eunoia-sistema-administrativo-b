import { Inject, Injectable } from '@nestjs/common';
import { SESSION_REPOSITORY, SessionRepository } from 'src/modules/sessions/application/ports/session.repository';
import { UserId } from 'src/modules/sessions/domain/values-objects/user.vo';

@Injectable()
export class RevokeAllSessionsUseCase {
  constructor(
    @Inject(SESSION_REPOSITORY)
    private readonly sessionRepository: SessionRepository,
  ) {}

  async execute(userId: string) {
    new UserId(userId);

    const now = new Date();
    await this.sessionRepository.revokeAllForUser(userId, now);

    return { revoked: true };
  }
}
