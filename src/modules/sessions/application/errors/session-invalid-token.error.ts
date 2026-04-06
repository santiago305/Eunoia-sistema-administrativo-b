import { SessionApplicationError } from './session-application.error';

export class SessionInvalidTokenApplicationError extends SessionApplicationError {
  readonly code = 'SESSION_APPLICATION_INVALID_TOKEN';
  readonly identifier = 'SESSION_INVALID_TOKEN';

  constructor() {
    super('Token invalido o sin identificador');
  }
}
