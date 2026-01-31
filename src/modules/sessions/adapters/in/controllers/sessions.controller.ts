import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { JwtAuthGuard } from 'src/modules/auth/adapters/in/guards/jwt-auth.guard';
import { User as CurrentUser } from 'src/shared/utilidades/decorators/user.decorator';
import { RevokeAllSessionsLessMeUseCase } from 'src/modules/sessions/application/use-cases/revoke-all-session-less-me.usecase';
import { ListUserSessionsUseCase } from 'src/modules/sessions/application/use-cases/list-user-sessions.usecase';
import { RevokeSessionUseCase } from 'src/modules/sessions/application/use-cases/revoke-session.usecase';
import { RevokeAllSessionsUseCase } from 'src/modules/sessions/application/use-cases/revoke-all-sessions.usecase';
import { getDeviceIdOrThrow } from 'src/shared/utilidades/utils/getOrCreateDeviceId.util';

@Controller('sessions')
@UseGuards(JwtAuthGuard)
export class SessionsController {
  constructor(
    private readonly listUserSessionsUseCase: ListUserSessionsUseCase,
    private readonly revokeSessionUseCase: RevokeSessionUseCase,
    private readonly revokeAllSessionsUseCase: RevokeAllSessionsUseCase,
    private readonly revokeAllSessionsLessMeUseCase: RevokeAllSessionsLessMeUseCase,

  ) {}

  @Get('me')
  async listMySessions(
    @CurrentUser() user: { id: string },
    @Req() req: Request,
    @Query('includeRevoked') includeRevoked?: string,
    @Query('includeExpired') includeExpired?: string,
  ) {
    const deviceId = getDeviceIdOrThrow(req);
    const sessions = await this.listUserSessionsUseCase.execute(user.id, {
      includeRevoked: includeRevoked === 'true',
      includeExpired: includeExpired === 'true',
    });
    return sessions.map((s) => ({
      ...s,
      isCurrent: s.deviceId === deviceId,
    }));
  }

  @Patch('revoke/allLessMe')
  revokeAllLessMe(@CurrentUser() user: { id: string }, @Req() req: Request) {
    const deviceId = getDeviceIdOrThrow(req);
    return this.revokeAllSessionsLessMeUseCase.execute(user.id, deviceId);
  }

  @Patch(':id/revoke')
  revoke(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.revokeSessionUseCase.execute(id, user.id);
  }

  @Patch('revoke-all')
  revokeAll(@CurrentUser() user: { id: string }) {
    return this.revokeAllSessionsUseCase.execute(user.id);
  }
}
