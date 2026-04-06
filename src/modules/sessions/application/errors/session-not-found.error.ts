import { SessionApplicationError } from './session-application.error';

export class SessionNotFoundApplicationError extends SessionApplicationError {
  readonly code = 'SESSION_APPLICATION_NOT_FOUND';
  readonly identifier = 'SESSION_NOT_FOUND';

  constructor(message = 'Sesion no encontrada') {
    super(message);
  }
}
