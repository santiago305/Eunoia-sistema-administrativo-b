import { Controller, Delete, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/modules/auth/adapters/in/guards/jwt-auth.guard';
import { User as CurrentUser } from 'src/shared/utilidades/decorators/user.decorator';
import { ListActiveSessionsUseCase } from 'src/modules/sessions/application/use-cases/list-active-sessions.usecase';
import { RevokeSessionUseCase } from 'src/modules/sessions/application/use-cases/revoke-session.usecase';
import { RevokeAllSessionsUseCase } from 'src/modules/sessions/application/use-cases/revoke-all-sessions.usecase';
import { SessionResponseDto } from '../dtos/session-response.dto';

@Controller('sessions')
export class SessionsController {
  constructor(
    private readonly listActiveSessionsUseCase: ListActiveSessionsUseCase,
    private readonly revokeSessionUseCase: RevokeSessionUseCase,
    private readonly revokeAllSessionsUseCase: RevokeAllSessionsUseCase,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async listActive(
    @CurrentUser() user: { id: string; sessionId?: string },
  ): Promise<SessionResponseDto[]> {
    const sessions = await this.listActiveSessionsUseCase.execute(user.id);
    return sessions.map((session) => ({
      id: session.id,
      userId: session.userId,
      isCurrent: user.sessionId === session.id,
      createdAt: session.createdAt,
      lastUsedAt: session.lastUsedAt,
      expiresAt: session.expiresAt,
      revokedAt: session.revokedAt,
      ip: session.ip,
      userAgent: session.userAgent,
      deviceName: session.deviceName,
    }));
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  revokeOne(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.revokeSessionUseCase.execute({ sessionId: id, userId: user.id });
  }

  @Delete()
  @UseGuards(JwtAuthGuard)
  revokeAll(@CurrentUser() user: { id: string; sessionId?: string }) {
    return this.revokeAllSessionsUseCase.execute({
      userId: user.id,
      currentSessionId: user.sessionId,
    });
  }
}
