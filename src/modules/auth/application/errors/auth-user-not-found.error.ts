import { AuthApplicationError } from "./auth-application.error";

export class AuthUserNotFoundError extends AuthApplicationError {
  readonly code = "AUTH_APPLICATION_NOT_FOUND";
  readonly identifier = "AUTH_USER_NOT_FOUND";

  constructor() {
    super("Usuario no encontrado");
  }
}
