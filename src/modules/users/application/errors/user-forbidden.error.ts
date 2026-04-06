import { UserApplicationError } from "./user-application.error";

export class UserForbiddenApplicationError extends UserApplicationError {
  readonly code = "USERS_APPLICATION_FORBIDDEN";
  readonly identifier = "USER_FORBIDDEN";

  constructor(message = "Acceso denegado") {
    super(message);
  }
}
