import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { SESSION_REPOSITORY, SessionRepository } from '../ports/session.repository';

@Injectable()
export class RevokeAllSessionsUseCase {
  constructor(
    @Inject(SESSION_REPOSITORY)
    private readonly sessionRepository: SessionRepository,
  ) {}

  async execute(params: { userId: string; currentSessionId?: string }) {
    const id = params.userId?.trim();
    const currentSessionId = params.currentSessionId?.trim();
    if (!id) {
      throw new UnauthorizedException('Token invalido o sin identificador');
    }

    const affected = await this.sessionRepository.revokeAllByUserId(id, currentSessionId);
    return { message: 'Todas las sesiones cerradas', affected };
  }
}
