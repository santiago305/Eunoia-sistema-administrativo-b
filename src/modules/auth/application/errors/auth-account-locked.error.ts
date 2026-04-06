import { AuthApplicationError } from "./auth-application.error";

export class AuthAccountLockedError extends AuthApplicationError {
  readonly code = "AUTH_APPLICATION_LOCKED";
  readonly identifier = "AUTH_ACCOUNT_LOCKED";

  constructor(
    public readonly lockedUntil: string,
    public readonly retryAfterSeconds: number,
    remaining: string,
  ) {
    super(`Cuenta bloqueada. Intenta nuevamente en ${remaining}`);
  }
}
