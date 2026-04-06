import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Session } from '../adapters/out/persistence/typeorm/entities/session.entity';
import { User } from 'src/modules/users/adapters/out/persistence/typeorm/entities/user.entity';
import { SessionsController } from '../adapters/in/controllers/sessions.controller';
import { CreateSessionUseCase } from '../application/use-cases/create-session.usecase';
import { RevokeSessionUseCase } from '../application/use-cases/revoke-session.usecase';
import { SESSION_REPOSITORY } from '../application/ports/session.repository';
import { SESSION_READ_REPOSITORY } from '../application/ports/session-read.repository';
import { SESSION_TOKEN_HASHER } from '../application/ports/session-token-hasher.repository';
import { sessionsModuleProviders } from '../composition/container';

@Module({
  imports: [TypeOrmModule.forFeature([Session, User])],
  controllers: [SessionsController],
  providers: [...sessionsModuleProviders],
  exports: [
    CreateSessionUseCase,
    RevokeSessionUseCase,
    SESSION_REPOSITORY,
    SESSION_READ_REPOSITORY,
    SESSION_TOKEN_HASHER,
  ],
})
export class SessionsModule {}
