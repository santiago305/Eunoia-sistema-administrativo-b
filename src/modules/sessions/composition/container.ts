import { SESSION_READ_REPOSITORY } from '../application/ports/session-read.repository';
import { SESSION_TOKEN_HASHER } from '../application/ports/session-token-hasher.repository';
import { SESSION_REPOSITORY } from '../application/ports/session.repository';
import { sessionsUseCasesProviders } from '../application/providers/sessions-usecases.providers';
import { TypeormSessionReadRepository } from '../adapters/out/persistence/typeorm/repositories/typeorm-session-read.repository';
import { TypeormSessionRepository } from '../adapters/out/persistence/typeorm/repositories/typeorm-session.repository';
import { Argon2SessionTokenHasherRepository } from '../infrastructure/providers/argon2-session-token-hasher.repository';

export const sessionsModuleProviders = [
  ...sessionsUseCasesProviders,
  { provide: SESSION_REPOSITORY, useClass: TypeormSessionRepository },
  { provide: SESSION_READ_REPOSITORY, useClass: TypeormSessionReadRepository },
  { provide: SESSION_TOKEN_HASHER, useClass: Argon2SessionTokenHasherRepository },
];
