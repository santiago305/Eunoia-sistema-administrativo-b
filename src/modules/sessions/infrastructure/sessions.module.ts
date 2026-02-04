import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Session } from '../adapters/out/persistence/typeorm/entities/session.entity';
import { User } from 'src/modules/users/adapters/out/persistence/typeorm/entities/user.entity';
import { SessionsController } from '../adapters/in/controllers/sessions.controller';
import { CreateSessionUseCase } from '../application/use-cases/create-session.usecase';
import { ListActiveSessionsUseCase } from '../application/use-cases/list-active-sessions.usecase';
import { RevokeSessionUseCase } from '../application/use-cases/revoke-session.usecase';
import { RevokeAllSessionsUseCase } from '../application/use-cases/revoke-all-sessions.usecase';
import { SESSION_REPOSITORY } from '../application/ports/session.repository';
import { SESSION_READ_REPOSITORY } from '../application/ports/session-read.repository';
import { SESSION_TOKEN_HASHER } from '../application/ports/session-token-hasher.repository';
import { TypeormSessionRepository } from '../adapters/out/persistence/typeorm/repositories/typeorm-session.repository';
import { TypeormSessionReadRepository } from '../adapters/out/persistence/typeorm/repositories/typeorm-session-read.repository';
import { Argon2SessionTokenHasherRepository } from './providers/argon2-session-token-hasher.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Session, User])],
  controllers: [SessionsController],
  providers: [
    CreateSessionUseCase,
    ListActiveSessionsUseCase,
    RevokeSessionUseCase,
    RevokeAllSessionsUseCase,
    { provide: SESSION_REPOSITORY, useClass: TypeormSessionRepository },
    { provide: SESSION_READ_REPOSITORY, useClass: TypeormSessionReadRepository },
    { provide: SESSION_TOKEN_HASHER, useClass: Argon2SessionTokenHasherRepository },
  ],
  exports: [
    CreateSessionUseCase,
    RevokeSessionUseCase,
    SESSION_REPOSITORY,
    SESSION_READ_REPOSITORY,
    SESSION_TOKEN_HASHER,
  ],
})
export class SessionsModule {}
