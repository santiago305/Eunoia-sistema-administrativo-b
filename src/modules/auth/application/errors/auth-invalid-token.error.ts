import { AuthApplicationError } from "./auth-application.error";

export class AuthInvalidTokenError extends AuthApplicationError {
  readonly code = "AUTH_APPLICATION_UNAUTHORIZED";
  readonly identifier = "AUTH_INVALID_TOKEN";

  constructor() {
    super("Token invalido");
  }
}
