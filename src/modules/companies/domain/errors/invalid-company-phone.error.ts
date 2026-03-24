export class InvalidCompanyPhoneError extends Error {
  constructor(message: string = "Telefono de empresa invalido") {
    super(message);
    this.name = "InvalidCompanyPhoneError";
  }
}
