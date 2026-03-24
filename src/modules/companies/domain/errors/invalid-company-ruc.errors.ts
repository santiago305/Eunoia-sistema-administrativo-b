export class InvalidCompanyRucError extends Error {
  constructor() {
    super("El RUC de la empresa debe contener exactamente 11 dígitos");
    this.name = "InvalidCompanyRucError";
  }
}