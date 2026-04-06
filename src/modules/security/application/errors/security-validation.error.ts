import { SecurityApplicationError } from './security-application.error';

export class SecurityValidationApplicationError extends SecurityApplicationError {
  readonly code = 'SECURITY_APPLICATION_VALIDATION';
  readonly identifier = 'SECURITY_VALIDATION_ERROR';

  constructor(message: string) {
    super(message);
  }
}
