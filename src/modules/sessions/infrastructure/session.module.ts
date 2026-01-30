import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SessionsController } from '../adapters/in/controllers/sessions.controller';
import { Session as OrmSession } from '../adapters/out/persistence/typeorm/entities/session.entity';
import { TypeormSessionRepository } from '../adapters/out/persistence/typeorm/repositories/typeorm-session.repository';
import { TypeormSessionReadRepository } from '../adapters/out/persistence/typeorm/repositories/typeorm-session-read.repository';

import { SESSION_REPOSITORY } from '../application/ports/session.repository';
import { SESSION_READ_REPOSITORY } from '../application/ports/session-read.repository';

import { CreateSessionUseCase } from '../application/use-cases/create-session.usecase';
import { ListUserSessionsUseCase } from '../application/use-cases/list-user-sessions.usecase';
import { RevokeSessionUseCase } from '../application/use-cases/revoke-session.usecase';
import { RevokeAllSessionsUseCase } from '../application/use-cases/revoke-all-sessions.usecase';
import { RevokeAllSessionsLessMeUseCase } from '../application/use-cases/revoke-all-session-less-me.usecase';
import { TouchSessionUseCase } from '../application/use-cases/touch-session.usecase';
import { UpdateSessionRefreshUseCase } from '../application/use-cases/update-session-refresh.usecase';
import { UpsertSessionUseCase } from '../application/use-cases/upsert-session.usecase';
import { RevokeSessionByDeviceUseCase } from '../application/use-cases/revoke-session-by-device.usecase';

@Module({
  imports: [TypeOrmModule.forFeature([OrmSession])],
  controllers: [SessionsController],
  providers: [
    CreateSessionUseCase,
    ListUserSessionsUseCase,
    RevokeSessionUseCase,
    RevokeAllSessionsUseCase,
    RevokeAllSessionsLessMeUseCase,
    TouchSessionUseCase,
    UpdateSessionRefreshUseCase,
    UpsertSessionUseCase,
    RevokeSessionByDeviceUseCase,
    {
      provide: SESSION_REPOSITORY,
      useClass: TypeormSessionRepository,
    },
    {
      provide: SESSION_READ_REPOSITORY,
      useClass: TypeormSessionReadRepository,
    },
  ],
  exports: [
    SESSION_REPOSITORY,
    SESSION_READ_REPOSITORY,
    CreateSessionUseCase,
    RevokeSessionUseCase,
    UpsertSessionUseCase,
    RevokeSessionByDeviceUseCase,
    RevokeAllSessionsUseCase,
    RevokeAllSessionsLessMeUseCase,

  ],
})
export class SessionsModule {}
