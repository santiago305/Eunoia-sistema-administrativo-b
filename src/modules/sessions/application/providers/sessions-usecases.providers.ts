import { CreateSessionUseCase } from '../use-cases/create-session.usecase';
import { ListActiveSessionsUseCase } from '../use-cases/list-active-sessions.usecase';
import { RevokeAllSessionsUseCase } from '../use-cases/revoke-all-sessions.usecase';
import { RevokeSessionUseCase } from '../use-cases/revoke-session.usecase';

export const sessionsUseCasesProviders = [
  CreateSessionUseCase,
  ListActiveSessionsUseCase,
  RevokeSessionUseCase,
  RevokeAllSessionsUseCase,
];
