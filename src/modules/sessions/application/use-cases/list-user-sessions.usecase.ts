import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import {
  SESSION_READ_REPOSITORY,
  SessionReadRepository,
} from 'src/modules/sessions/application/ports/session-read.repository';
import { UserId } from 'src/modules/sessions/domain/values-objects/user.vo';

@Injectable()
export class ListUserSessionsUseCase {
  constructor(
    @Inject(SESSION_READ_REPOSITORY)
    private readonly sessionReadRepository: SessionReadRepository,
  ) {}

  async execute(
    userId: string,
    params?: {
      includeRevoked?: boolean;
      includeExpired?: boolean;
    }
  ) {
    new UserId(userId);

    return this.sessionReadRepository.listUserSessions(userId, {
      includeRevoked: params?.includeRevoked ?? false,
      includeExpired: params?.includeExpired ?? false,
    });
  }
}
