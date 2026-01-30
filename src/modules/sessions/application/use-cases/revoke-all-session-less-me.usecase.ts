import { Inject, Injectable } from '@nestjs/common';
import { SESSION_REPOSITORY, SessionRepository } from 'src/modules/sessions/application/ports/session.repository';
import { UserId } from 'src/modules/sessions/domain/values-objects/user.vo';

@Injectable()
export class RevokeAllSessionsLessMeUseCase {
  constructor(
    @Inject(SESSION_REPOSITORY)
    private readonly sessionRepository: SessionRepository,
  ) {}

  async execute(userId: string, deviceId: string) {
    new UserId(userId);

    const now = new Date();
    await this.sessionRepository.revokeAllForUserExceptDevice(userId, deviceId, now);

    return { revoked: true };
  }
}
