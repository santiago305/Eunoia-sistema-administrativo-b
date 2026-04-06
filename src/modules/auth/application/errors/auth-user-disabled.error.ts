import { AuthApplicationError } from "./auth-application.error";

export class AuthUserDisabledError extends AuthApplicationError {
  readonly code = "AUTH_APPLICATION_FORBIDDEN";
  readonly identifier = "AUTH_USER_DISABLED";

  constructor() {
    super("Cuenta desactivada. Contacta a un administrador para reactivacion");
  }
}
