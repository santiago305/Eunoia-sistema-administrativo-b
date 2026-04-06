import { RoleApplicationError } from './role-application.error';

export class RoleNotFoundApplicationError extends RoleApplicationError {
  readonly code = 'ROLE_APPLICATION_NOT_FOUND';
  readonly identifier = 'ROLE_NOT_FOUND';

  constructor() {
    super('Rol no encontrado');
  }
}
