import { UserApplicationError } from "./user-application.error";

export class UserNotFoundApplicationError extends UserApplicationError {
  readonly code = "USERS_APPLICATION_NOT_FOUND";
  readonly identifier = "USER_NOT_FOUND";

  constructor() {
    super("Usuario no encontrado");
  }
}
