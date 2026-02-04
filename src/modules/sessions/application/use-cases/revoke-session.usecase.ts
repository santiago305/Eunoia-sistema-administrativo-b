import { Inject, Injectable, BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { SESSION_REPOSITORY, SessionRepository } from '../ports/session.repository';

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
      throw new BadRequestException('Session id invalido');
    }

    if (!userId) {
      throw new UnauthorizedException('Token invalido o sin identificador');
    }

    const revoked = await this.sessionRepository.revokeById(sessionId, userId);
    if (!revoked) {
      throw new NotFoundException('Sesion no encontrada, ya cerrada o no pertenece al usuario');
    }

    return { message: 'Sesion cerrada' };
  }
}
