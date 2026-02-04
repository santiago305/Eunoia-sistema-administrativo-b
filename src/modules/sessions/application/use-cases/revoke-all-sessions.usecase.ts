import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { SESSION_REPOSITORY, SessionRepository } from '../ports/session.repository';

@Injectable()
export class RevokeAllSessionsUseCase {
  constructor(
    @Inject(SESSION_REPOSITORY)
    private readonly sessionRepository: SessionRepository,
  ) {}

  async execute(userId: string) {
    const id = userId?.trim();
    if (!id) {
      throw new UnauthorizedException('Token invalido o sin identificador');
    }

    await this.sessionRepository.revokeAllByUserId(id);
    return { message: 'Todas las sesiones cerradas' };
  }
}
