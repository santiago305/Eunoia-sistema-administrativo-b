import { AuthApplicationError } from "./auth-application.error";

export class AuthInvalidCredentialsError extends AuthApplicationError {
  readonly code = "AUTH_APPLICATION_UNAUTHORIZED";
  readonly identifier = "AUTH_INVALID_CREDENTIALS";

  constructor() {
    super("Credenciales invalidas");
  }
}
