import { IdentityApplicationError } from "./identity-application.error";

export class IdentityValidationError extends IdentityApplicationError {
  readonly code = "IDENTITY_APPLICATION_VALIDATION";
  readonly identifier = "IDENTITY_VALIDATION_ERROR";

  constructor(message: string) {
    super(message);
  }
}
