import { RoleApplicationError } from './role-application.error';

export class RoleConflictApplicationError extends RoleApplicationError {
  readonly code = 'ROLE_APPLICATION_CONFLICT';
  readonly identifier = 'ROLE_CONFLICT';

  constructor(message = 'Este rol ya existe') {
    super(message);
  }
}
