import { Inject, Injectable, BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { SESSION_REPOSITORY, SessionRepository } from '../ports/session.repository';
import { SessionInvalidTokenApplicationError } from '../errors/session-invalid-token.error';
import { SessionNotFoundApplicationError } from '../errors/session-not-found.error';
import { SessionValidationApplicationError } from '../errors/session-validation.error';

@Injectable()
export class RevokeSessionUseCase {
  constructor(
    @Inject(SESSION_REPOSITORY)
    private readonly sessionRepository: SessionRepository,
  ) {}

  async execute(params: { sessionId: string; userId: string }) {
    const sessionId = params.sessionId?.trim();
    const userId = params.userId?.trim();

    if (!sessionId) {
      throw new BadRequestException(new SessionValidationApplicationError('Session id invalido').message);
    }

    if (!userId) {
      throw new UnauthorizedException(new SessionInvalidTokenApplicationError().message);
    }

    const revoked = await this.sessionRepository.revokeById(sessionId, userId);
    if (!revoked) {
      throw new NotFoundException(
        new SessionNotFoundApplicationError('Sesion no encontrada, ya cerrada o no pertenece al usuario').message,
      );
    }

    return { message: 'Sesion cerrada' };
  }
}
