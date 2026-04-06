import { SecurityApplicationError } from './security-application.error';

export class SecurityForbiddenApplicationError extends SecurityApplicationError {
  readonly code = 'SECURITY_APPLICATION_FORBIDDEN';
  readonly identifier = 'SECURITY_FORBIDDEN';

  constructor(message = 'Operacion de seguridad no permitida') {
    super(message);
  }
}
