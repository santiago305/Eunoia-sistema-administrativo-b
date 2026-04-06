import { UserApplicationError } from "./user-application.error";

export class UserConflictApplicationError extends UserApplicationError {
  readonly code = "USERS_APPLICATION_CONFLICT";
  readonly identifier = "USER_CONFLICT";

  constructor(message: string) {
    super(message);
  }
}
