import { SessionApplicationError } from './session-application.error';

export class SessionValidationApplicationError extends SessionApplicationError {
  readonly code = 'SESSION_APPLICATION_VALIDATION';
  readonly identifier = 'SESSION_VALIDATION_ERROR';

  constructor(message: string) {
    super(message);
  }
}
