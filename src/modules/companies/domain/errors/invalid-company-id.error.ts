export class InvalidCompanyIdError extends Error {
  constructor(message: string = "Id de empresa invalido") {
    super(message);
    this.name = "InvalidCompanyIdError";
  }
}
