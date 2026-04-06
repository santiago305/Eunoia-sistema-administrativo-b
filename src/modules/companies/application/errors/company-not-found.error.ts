import { CompanyApplicationError } from "./company-application.error";

export class CompanyNotFoundApplicationError extends CompanyApplicationError {
  readonly code = "COMPANIES_APPLICATION_NOT_FOUND";
  readonly identifier = "COMPANY_NOT_FOUND";

  constructor() {
    super("Empresa no encontrada");
  }
}
