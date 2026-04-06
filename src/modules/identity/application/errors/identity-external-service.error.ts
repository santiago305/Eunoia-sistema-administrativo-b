import { IdentityApplicationError } from "./identity-application.error";

export class IdentityExternalServiceError extends IdentityApplicationError {
  readonly code = "IDENTITY_EXTERNAL_SERVICE_ERROR";
  readonly identifier = "IDENTITY_EXTERNAL_SERVICE_ERROR";

  constructor(message: string) {
    super(message);
  }
}
