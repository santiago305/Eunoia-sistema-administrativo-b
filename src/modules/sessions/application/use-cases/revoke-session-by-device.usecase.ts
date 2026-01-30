import { Inject, Injectable } from '@nestjs/common';
import { SESSION_REPOSITORY, SessionRepository } from 'src/modules/sessions/application/ports/session.repository';
import { RevokeSessionUseCase } from 'src/modules/sessions/application/use-cases/revoke-session.usecase';

@Injectable()
export class RevokeSessionByDeviceUseCase {
  constructor(
    @Inject(SESSION_REPOSITORY)
    private readonly sessionRepository: SessionRepository,
    private readonly revokeSessionUseCase: RevokeSessionUseCase,
  ) {}

  async execute(userId: string, deviceId: string) {
    const session = await this.sessionRepository.findActiveByUserAndDevice(userId, deviceId);

    // Si no existe sesión activa, no hace nada
    if (!session) return { revoked: false };

    await this.revokeSessionUseCase.execute(session.id, userId);

    return { revoked: true };
  }
}
