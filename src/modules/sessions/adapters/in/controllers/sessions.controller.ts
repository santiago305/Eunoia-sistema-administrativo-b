import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/modules/auth/adapters/in/guards/jwt-auth.guard';
import { User as CurrentUser } from 'src/shared/utilidades/decorators/user.decorator';

import { ListUserSessionsUseCase } from 'src/modules/sessions/application/use-cases/list-user-sessions.usecase';
import { RevokeSessionUseCase } from 'src/modules/sessions/application/use-cases/revoke-session.usecase';
import { RevokeAllSessionsUseCase } from 'src/modules/sessions/application/use-cases/revoke-all-sessions.usecase';

@Controller('sessions')
@UseGuards(JwtAuthGuard)
export class SessionsController {
  constructor(
    private readonly listUserSessionsUseCase: ListUserSessionsUseCase,
    private readonly revokeSessionUseCase: RevokeSessionUseCase,
    private readonly revokeAllSessionsUseCase: RevokeAllSessionsUseCase,
  ) {}

  @Get('me')
  listMySessions(
    @CurrentUser() user: { id: string },
    @Query('includeRevoked') includeRevoked?: string,
    @Query('includeExpired') includeExpired?: string,
  ) {
    return this.listUserSessionsUseCase.execute(user.id, {
      includeRevoked: includeRevoked === 'true',
      includeExpired: includeExpired === 'true',
    });
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
