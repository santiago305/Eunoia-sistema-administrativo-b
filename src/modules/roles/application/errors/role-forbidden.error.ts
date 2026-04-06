import { RoleApplicationError } from './role-application.error';

export class RoleForbiddenApplicationError extends RoleApplicationError {
  readonly code = 'ROLE_APPLICATION_FORBIDDEN';
  readonly identifier = 'ROLE_FORBIDDEN';

  constructor(message = 'No autorizado para realizar esta accion sobre roles') {
    super(message);
  }
}
